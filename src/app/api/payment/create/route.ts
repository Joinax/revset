// src/app/api/payment/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// Базовый URL API ЮKassa
const YOOKASSA_API = 'https://api.yookassa.ru/v3'

// Basic Auth — shopId:secretKey в Base64
function getAuthHeader() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 })
    }

    // Получаем товар из БД
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }
    if (product.price === null) {
      return NextResponse.json({ error: 'Товар бесплатный' }, { status: 400 })
    }

    // Проверяем что товар не куплен ранее
    const existingOrder = await db.order.findFirst({
      where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
    })
    if (existingOrder) {
      return NextResponse.json({ error: 'Вы уже купили этот товар' }, { status: 400 })
    }

    // Создаём заказ в БД
    const order = await db.order.create({
      data: {
        userId:      session.user.id,
        status:      'PENDING',
        totalAmount: product.price,
        items: { create: { productId: product.id, price: product.price } },
      },
    })

    // Создаём платёж в ЮKassa через REST API
    // Idempotence-Key — уникальный ключ для защиты от дублирования
    const response = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Authorization':    getAuthHeader(),
        'Content-Type':     'application/json',
        'Idempotence-Key':  randomUUID(),   // обязательно по документации ЮKassa
      },
      body: JSON.stringify({
        amount: {
          value:    product.price.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type:       'redirect',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`,
        },
        capture:     true,
        description: `Покупка: ${product.name}`,
        metadata: {
          orderId:   order.id,
          productId: product.id,
          userId:    session.user.id,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('YooKassa error:', error)
      // Удаляем созданный заказ если платёж не создался
      await db.order.delete({ where: { id: order.id } })
      return NextResponse.json({ error: 'Ошибка создания платежа в ЮKassa' }, { status: 500 })
    }

    const payment = await response.json()

    // Сохраняем paymentId и ссылку на оплату
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentId:  payment.id,
        paymentUrl: payment.confirmation.confirmation_url,
      },
    })

    return NextResponse.json({
      paymentUrl: payment.confirmation.confirmation_url,
      orderId:    order.id,
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
