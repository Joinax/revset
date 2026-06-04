// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

function getAuthHeader() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, object: payment } = body

    if (event === 'payment.succeeded') {
      const orderId = payment.metadata?.orderId
      if (!orderId) return NextResponse.json({ ok: true })

      // Верифицируем платёж напрямую в ЮKassa — не доверяем только вебхуку
      const verifyResponse = await fetch(`${YOOKASSA_API}/payments/${payment.id}`, {
        headers: { 'Authorization': getAuthHeader() },
      })

      if (!verifyResponse.ok) {
        return NextResponse.json({ error: 'Не удалось верифицировать платёж' }, { status: 400 })
      }

      const verified = await verifyResponse.json()

      if (verified.status !== 'succeeded') {
        return NextResponse.json({ error: 'Платёж не подтверждён' }, { status: 400 })
      }

      // Обновляем статус заказа
      await db.order.update({
        where: { id: orderId },
        data:  { status: 'PAID' },
      })

      console.log(`✅ Заказ ${orderId} оплачен`)
    }

    if (event === 'payment.canceled') {
      const orderId = payment.metadata?.orderId
      if (orderId) {
        await db.order.update({
          where: { id: orderId },
          data:  { status: 'CANCELLED' },
        })
        console.log(`❌ Заказ ${orderId} отменён`)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
