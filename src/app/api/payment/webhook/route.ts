// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendSaleNotificationEmail } from '@/lib/mailer'
 
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
 
      // Верифицируем платёж напрямую в ЮKassa
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
 
      // Обновляем статус заказа и загружаем данные для уведомления
      const order = await db.order.update({
        where: { id: orderId },
        data:  { status: 'PAID' },
        include: {
          items: {
            include: {
              product: {
                include: {
                  author: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      })
 
      console.log(`✅ Заказ ${orderId} оплачен`)

      // Очищаем корзину пользователя от купленных товаров
      const purchasedProductIds = order.items.map(i => i.product.id)
      const cart = await db.cart.findUnique({ where: { userId: order.userId } })
      if (cart) {
        await db.cartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: purchasedProductIds } },
        })
      }
 
      // Отправляем уведомления авторам каждого товара в заказе
      for (const item of order.items) {
        const author = item.product.author
        if (author.email) {
          try {
            await sendSaleNotificationEmail(
              author.email,
              author.name ?? 'Автор',
              item.product.name,
              item.price,
            )
            console.log(`📧 Уведомление отправлено автору: ${author.email}`)
          } catch (emailError) {
            // Не падаем если письмо не отправилось — заказ уже оплачен
            console.error('Email error:', emailError)
          }
        }
      }
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