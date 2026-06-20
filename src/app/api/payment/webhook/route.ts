// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import ipRangeCheck from 'ip-range-check'
import { db } from '@/lib/db'
import { sendSaleNotificationEmail } from '@/lib/mailer'

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

function getAuthHeader() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    // Проверяем IP-адрес источника — ЮKassa отправляет webhook только со своих IP.
    // Это первый рубеж защиты от поддельных запросов.
    // Актуальный список: https://yookassa.ru/developers/using-api/webhooks
    const YOOKASSA_IPS = [
      '185.71.76.0/27',
      '185.71.77.0/27',
      '77.75.153.0/25',
      '77.75.156.11',
      '77.75.156.35',
      '77.75.154.128/25',
      '2a02:5180::/32',
    ]

    // Реальный IP берём из заголовка который проставляет reverse proxy (nginx/Cloudflare).
    // Если приложение стоит за proxy — использовать 'x-forwarded-for' или 'x-real-ip'.
    // Если напрямую — req.ip (но в Next.js это не всегда доступно).
    // ВАЖНО: настроить в зависимости от инфраструктуры деплоя.
    const clientIp = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()

    if (!clientIp || !isYookassaIp(clientIp, YOOKASSA_IPS)) {
      console.warn(`[webhook] Blocked request from unknown IP: ${clientIp}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { event, object: payment } = body

    if (event === 'payment.succeeded') {
      const orderId = payment.metadata?.orderId
      if (!orderId) return NextResponse.json({ ok: true })

      // Верифицируем платёж напрямую в ЮKassa — не доверяем данным из тела webhook.
      // Передаём payment.id из webhook только для построения URL запроса к API,
      // а все данные (статус, сумму, orderId) берём из ответа ЮKassa, не из webhook.
      const verifyResponse = await fetch(`${YOOKASSA_API}/payments/${payment.id}`, {
        headers: { 'Authorization': getAuthHeader() },
      })

      if (!verifyResponse.ok) {
        console.error(`[webhook] Failed to verify payment ${payment.id}`)
        return NextResponse.json({ error: 'Не удалось верифицировать платёж' }, { status: 400 })
      }

      const verified = await verifyResponse.json()

      // Проверяем статус из ответа ЮKassa (не из webhook)
      if (verified.status !== 'succeeded') {
        return NextResponse.json({ error: 'Платёж не подтверждён' }, { status: 400 })
      }

      // Дополнительно сверяем orderId из метаданных верифицированного платежа —
      // а не из тела webhook. Это защищает от атаки где злоумышленник передаёт
      // реальный payment.id чужого платежа с подменённым orderId в теле webhook.
      const verifiedOrderId = verified.metadata?.orderId
      if (!verifiedOrderId || verifiedOrderId !== orderId) {
        console.error(`[webhook] orderId mismatch: webhook=${orderId}, verified=${verifiedOrderId}`)
        return NextResponse.json({ error: 'Некорректные данные платежа' }, { status: 400 })
      }

      // Идемпотентность — проверяем текущий статус заказа перед обновлением.
      // ЮKassa может прислать один webhook несколько раз — повторная обработка
      // уже оплаченного заказа приведёт к задвоению статистики и писем авторам.
      const existingOrder = await db.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      })

      if (!existingOrder) {
        console.error(`[webhook] Order not found: ${orderId}`)
        return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
      }

      if (existingOrder.status === 'PAID') {
        // Уже обработано — возвращаем 200 чтобы ЮKassa не повторяла webhook
        console.log(`[webhook] Order ${orderId} already paid, skipping`)
        return NextResponse.json({ ok: true })
      }

      // Обновляем статус заказа и загружаем данные для уведомлений и статистики
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

      console.log(`[webhook] Order ${orderId} paid`)

      // Обновляем счётчики продаж/выручки авторов — группируем по автору
      // на случай если в заказе несколько товаров одного автора
      const perAuthor = new Map<string, { sales: number; revenue: number }>()
      for (const item of order.items) {
        const authorId = item.product.authorId
        const entry = perAuthor.get(authorId) ?? { sales: 0, revenue: 0 }
        entry.sales += 1
        entry.revenue += item.price
        perAuthor.set(authorId, entry)
      }

      await Promise.all(
        Array.from(perAuthor.entries()).map(([authorId, { sales, revenue }]) =>
          db.authorProfile.upsert({
            where: { userId: authorId },
            update: {
              totalSales:   { increment: sales },
              totalRevenue: { increment: revenue },
            },
            create: {
              userId: authorId,
              totalSales:   sales,
              totalRevenue: revenue,
            },
          })
        )
      )

      // Очищаем корзину от купленных товаров
      const purchasedProductIds = order.items.map(i => i.product.id)
      const cart = await db.cart.findUnique({ where: { userId: order.userId } })
      if (cart) {
        await db.cartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: purchasedProductIds } },
        })
      }

      // Уведомляем авторов о продаже
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
          } catch (emailError) {
            // Не падаем если письмо не отправилось — заказ уже оплачен
            console.error('[webhook] Email error:', emailError)
          }
        }
      }
    }

    if (event === 'payment.canceled') {
      const orderId = payment.metadata?.orderId
      if (!orderId) return NextResponse.json({ ok: true })

      // Верифицируем отмену в ЮKassa — не доверяем данным из тела webhook
      const verifyResponse = await fetch(`${YOOKASSA_API}/payments/${payment.id}`, {
        headers: { 'Authorization': getAuthHeader() },
      })

      if (!verifyResponse.ok) {
        console.error(`[webhook] Failed to verify cancelled payment ${payment.id}`)
        return NextResponse.json({ error: 'Не удалось верифицировать платёж' }, { status: 400 })
      }

      const verified = await verifyResponse.json()

      if (verified.status !== 'canceled') {
        return NextResponse.json({ error: 'Платёж не отменён' }, { status: 400 })
      }

      const verifiedOrderId = verified.metadata?.orderId
      if (!verifiedOrderId || verifiedOrderId !== orderId) {
        console.error(`[webhook] orderId mismatch on cancel: webhook=${orderId}, verified=${verifiedOrderId}`)
        return NextResponse.json({ error: 'Некорректные данные платежа' }, { status: 400 })
      }

      // Идемпотентность — не обновляем уже отменённые или оплаченные заказы
      const existingOrder = await db.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      })

      if (existingOrder && existingOrder.status === 'PENDING') {
        await db.order.update({
          where: { id: orderId },
          data:  { status: 'CANCELLED' },
        })
        console.log(`[webhook] Order ${orderId} cancelled`)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('[webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Проверка IP с поддержкой CIDR-диапазонов через ip-range-check
function isYookassaIp(ip: string, allowlist: string[]): boolean {
  return ipRangeCheck(ip, allowlist)
}
