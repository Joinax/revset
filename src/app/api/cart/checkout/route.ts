// src/app/api/cart/checkout/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

function getAuthHeader() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, price: true } } },
        },
      },
    })

    if (!cart || cart.items.length === 0)
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 })

    const paidItems = cart.items.filter(i => i.product.price !== null)
    if (paidItems.length === 0)
      return NextResponse.json({ error: 'Нет платных товаров' }, { status: 400 })

    // Проверяем что ни один товар не куплен ранее
    const alreadyPurchased = await db.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'PAID',
        items: { some: { productId: { in: paidItems.map(i => i.product.id) } } },
      },
    })
    if (alreadyPurchased)
      return NextResponse.json({ error: 'Один или несколько товаров уже куплены' }, { status: 400 })

    const total = paidItems.reduce((s, i) => s + i.product.price!, 0)

    // Создаём заказ
    const order = await db.order.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
        totalAmount: total,
        items: {
          create: paidItems.map(i => ({
            productId: i.product.id,
            price: i.product.price!,
          })),
        },
      },
    })

    const description = paidItems.length === 1
      ? `Покупка: ${paidItems[0].product.name}`
      : `Покупка ${paidItems.length} семейств`

    // Создаём платёж в ЮKassa
    const response = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Authorization':   getAuthHeader(),
        'Content-Type':    'application/json',
        'Idempotence-Key': randomUUID(),
      },
      body: JSON.stringify({
        amount: { value: total.toFixed(2), currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`,
        },
        capture: true,
        description,
        metadata: { orderId: order.id, userId: session.user.id },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('YooKassa error:', err)
      await db.order.delete({ where: { id: order.id } })
      return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 })
    }

    const payment = await response.json()

    await db.order.update({
      where: { id: order.id },
      data: { paymentId: payment.id, paymentUrl: payment.confirmation.confirmation_url },
    })

    return NextResponse.json({ paymentUrl: payment.confirmation.confirmation_url, orderId: order.id })

  } catch (error) {
    console.error('Cart checkout error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
