// src/app/api/payment/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

function getAuthHeader() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }
    if (product.price === null) {
      return NextResponse.json({ error: 'Товар бесплатный' }, { status: 400 })
    }

    if (product.authorId === session.user.id) {
      return NextResponse.json({ error: 'Нельзя покупать собственные товары' }, { status: 400 })
    }

    // Проверяем что товар не куплен ранее
    const paidOrder = await db.order.findFirst({
      where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
    })
    if (paidOrder) {
      return NextResponse.json({ error: 'Вы уже купили этот товар' }, { status: 400 })
    }

    // Если уже есть незавершённый заказ на этот товар — переиспользуем его.
    // Это предотвращает накопление PENDING заказов когда пользователь
    // несколько раз нажимает "Купить" не завершая оплату.
    const pendingOrder = await db.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'PENDING',
        items:  { some: { productId } },
      },
      select: { id: true, paymentId: true, paymentUrl: true },
    })

    if (pendingOrder) {
      // Если у существующего заказа уже есть ссылка на оплату — проверяем
      // её актуальность в ЮKassa. Ссылки истекают через 1 час.
      if (pendingOrder.paymentId) {
        const verifyRes = await fetch(`${YOOKASSA_API}/payments/${pendingOrder.paymentId}`, {
          headers: { 'Authorization': getAuthHeader() },
        })

        if (verifyRes.ok) {
          const payment = await verifyRes.json()

          // Платёж ещё активен — возвращаем существующую ссылку
          if (payment.status === 'pending') {
            return NextResponse.json({
              paymentUrl: payment.confirmation.confirmation_url,
              orderId:    pendingOrder.id,
            })
          }

          // Платёж истёк или отменён в ЮKassa — создаём новый платёж
          // для того же заказа, не создавая новый заказ в БД
          if (payment.status === 'canceled') {
            const newPaymentRes = await fetch(`${YOOKASSA_API}/payments`, {
              method: 'POST',
              headers: {
                'Authorization':   getAuthHeader(),
                'Content-Type':    'application/json',
                'Idempotence-Key': randomUUID(),
              },
              body: JSON.stringify({
                amount: {
                  value:    product.price.toFixed(2),
                  currency: 'RUB',
                },
                confirmation: {
                  type:       'redirect',
                  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${pendingOrder.id}`,
                },
                capture:     true,
                description: `Покупка: ${product.name}`,
                metadata: {
                  orderId:   pendingOrder.id,
                  productId: product.id,
                  userId:    session.user.id,
                },
              }),
            })

            if (!newPaymentRes.ok) {
              return NextResponse.json({ error: 'Ошибка создания платежа в ЮKassa' }, { status: 500 })
            }

            const newPayment = await newPaymentRes.json()

            await db.order.update({
              where: { id: pendingOrder.id },
              data: {
                paymentId:  newPayment.id,
                paymentUrl: newPayment.confirmation.confirmation_url,
              },
            })

            return NextResponse.json({
              paymentUrl: newPayment.confirmation.confirmation_url,
              orderId:    pendingOrder.id,
            })
          }
        }
      }

      // У заказа нет paymentId или не смогли проверить — создаём новый платёж
      const newPaymentRes = await fetch(`${YOOKASSA_API}/payments`, {
        method: 'POST',
        headers: {
          'Authorization':   getAuthHeader(),
          'Content-Type':    'application/json',
          'Idempotence-Key': randomUUID(),
        },
        body: JSON.stringify({
          amount: {
            value:    product.price.toFixed(2),
            currency: 'RUB',
          },
          confirmation: {
            type:       'redirect',
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${pendingOrder.id}`,
          },
          capture:     true,
          description: `Покупка: ${product.name}`,
          metadata: {
            orderId:   pendingOrder.id,
            productId: product.id,
            userId:    session.user.id,
          },
        }),
      })

      if (!newPaymentRes.ok) {
        return NextResponse.json({ error: 'Ошибка создания платежа в ЮKassa' }, { status: 500 })
      }

      const newPayment = await newPaymentRes.json()

      await db.order.update({
        where: { id: pendingOrder.id },
        data: {
          paymentId:  newPayment.id,
          paymentUrl: newPayment.confirmation.confirmation_url,
        },
      })

      return NextResponse.json({
        paymentUrl: newPayment.confirmation.confirmation_url,
        orderId:    pendingOrder.id,
      })
    }

    // Нет ни оплаченного ни незавершённого заказа — создаём новый
    const order = await db.order.create({
      data: {
        userId:      session.user.id,
        status:      'PENDING',
        totalAmount: product.price,
        items: { create: { productId: product.id, price: product.price } },
      },
    })

    const response = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Authorization':   getAuthHeader(),
        'Content-Type':    'application/json',
        'Idempotence-Key': randomUUID(),
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
      await db.order.delete({ where: { id: order.id } })
      return NextResponse.json({ error: 'Ошибка создания платежа в ЮKassa' }, { status: 500 })
    }

    const payment = await response.json()

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
