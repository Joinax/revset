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
          pack: {
            select: {
              id: true, name: true, price: true,
              images: { orderBy: { position: 'asc' }, take: 1 },
              author: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  const items = (cart?.items ?? []).map(i => ({
    ...i,
    product: i.product
      ? { ...i.product, price: i.product.price !== null ? Number(i.product.price) : null }
      : null,
    pack: i.pack
      ? { ...i.pack, price: Number(i.pack.price) }
      : null,
  }))
  return NextResponse.json({ items })
}

// Добавить в корзину
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productId, packId } = body as { productId?: string; packId?: string }

  if (!productId && !packId) return NextResponse.json({ error: 'productId or packId required' }, { status: 400 })

  if (packId) {
    const pack = await db.pack.findUnique({
      where: { id: packId, moderationStatus: 'APPROVED' },
      select: { id: true, price: true },
    })
    if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
    if (Number(pack.price) === 0) return NextResponse.json({ error: 'Free packs cannot be added to cart' }, { status: 400 })

    const purchased = await db.order.findFirst({
      where: { userId: session.user.id, status: 'PAID', items: { some: { packId } } },
    })
    if (purchased) return NextResponse.json({ error: 'Already purchased' }, { status: 400 })

    const cart = await db.cart.upsert({
      where:  { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    })

    await db.cartItem.upsert({
      where:  { cartId_packId: { cartId: cart.id, packId } },
      create: { cartId: cart.id, packId },
      update: {},
    })

    const count = await db.cartItem.count({ where: { cartId: cart.id } })
    return NextResponse.json({ ok: true, count })
  }

  // --- productId path ---
  const product = await db.product.findUnique({
    where: { id: productId!, isPublished: true },
    select: { id: true, price: true },
  })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (product.price === null) return NextResponse.json({ error: 'Free products cannot be added to cart' }, { status: 400 })

  const purchased = await db.order.findFirst({
    where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
  })
  if (purchased) return NextResponse.json({ error: 'Already purchased' }, { status: 400 })

  const cart = await db.cart.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  })

  await db.cartItem.upsert({
    where:  { cartId_productId: { cartId: cart.id, productId: productId! } },
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

  const body = await req.json()
  const { productId, packId } = body as { productId?: string; packId?: string }

  const cart = await db.cart.findUnique({ where: { userId: session.user.id } })
  if (!cart) return NextResponse.json({ ok: true, count: 0 })

  if (packId) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, packId } })
  } else {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } })
  }

  const count = await db.cartItem.count({ where: { cartId: cart.id } })
  return NextResponse.json({ ok: true, count })
}
