// src/app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Получить корзину
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { addedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true, name: true, price: true,
              previewEmoji: true, previewBg: true, images: true,
              author: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  const items = (cart?.items ?? []).map(i => ({
    ...i,
    product: {
      ...i.product,
      price: i.product.price !== null ? Number(i.product.price) : null,
    },
  }))
  return NextResponse.json({ items })
}

// Добавить в корзину
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  // Проверяем что товар существует и платный
  const product = await db.product.findUnique({
    where: { id: productId, isPublished: true },
    select: { id: true, price: true },
  })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (product.price === null) return NextResponse.json({ error: 'Free products cannot be added to cart' }, { status: 400 })

  // Проверяем что не куплен
  const purchased = await db.order.findFirst({
    where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
  })
  if (purchased) return NextResponse.json({ error: 'Already purchased' }, { status: 400 })

  // Upsert корзину и добавляем товар
  const cart = await db.cart.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  })

  await db.cartItem.upsert({
    where:  { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId },
    update: {},
  })

  const count = await db.cartItem.count({ where: { cartId: cart.id } })
  return NextResponse.json({ ok: true, count })
}

// Удалить из корзины
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json()

  const cart = await db.cart.findUnique({ where: { userId: session.user.id } })
  if (!cart) return NextResponse.json({ ok: true })

  await db.cartItem.deleteMany({
    where: { cartId: cart.id, productId },
  })

  const count = await db.cartItem.count({ where: { cartId: cart.id } })
  return NextResponse.json({ ok: true, count })
}
