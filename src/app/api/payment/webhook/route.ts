// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import ipRangeCheck from 'ip-range-check'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
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

    const clientIp = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()

    if (!clientIp || !isYookassaIp(clientIp, YOOKASSA_IPS)) {
      console.warn(`[webhook] Blocked request from unknown IP: ${clientIp}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Zod-схема входящего webhook от ЮKassa.
    // Проверяем структуру до любой бизнес-логики — это защита от
    // мусорных запросов которые прошли IP-фильтр (например, с разрешённого IP).
    const webhookSchema = z.object({
      event: z.enum(['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture']),
      object: z.object({
        id:       z.string().min(1),
        status:   z.string().min(1),
        metadata: z.object({
          orderId: z.string().optional(),
        }).optional(),
        confirmation: z.object({
          confirmation_url: z.string().optional(),
        }).optional(),
      }),
    })

    let event: string
    let payment: z.infer<typeof webhookSchema>['object']

    try {
      const raw = await req.json()
      const result = webhookSchema.safeParse(raw)
      if (!result.success) {
        // Неизвестный тип события или неверная структура — возвращаем 200
        // чтобы ЮKassa не повторяла запрос бесконечно
        console.warn('[webhook] Unknown or invalid webhook structure:', result.error.flatten())
        return NextResponse.json({ ok: true })
      }
      event   = result.data.event
      payment = result.data.object
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    if (event === 'payment.succeeded') {
      const orderId = payment.metadata?.orderId
      if (!orderId) return NextResponse.json({ ok: true })

      // Верифицируем платёж напрямую в ЮKassa — не доверяем данным из тела webhook.
      const verifyResponse = await fetch(`${YOOKASSA_API}/payments/${payment.id}`, {
        headers: { 'Authorization': getAuthHeader() },
      })

      if (!verifyResponse.ok) {
        console.error(`[webhook] Failed to verify payment ${payment.id}`)
        return NextResponse.json({ error: 'Не удалось верифицировать платёж' }, { status: 400 })
      }

      const verified = await verifyResponse.json()

      if (verified.status !== 'succeeded') {
        return NextResponse.json({ error: 'Платёж не подтверждён' }, { status: 400 })
      }

      // Сверяем orderId из метаданных верифицированного платежа — защита от подмены
      const verifiedOrderId = verified.metadata?.orderId
      if (!verifiedOrderId || verifiedOrderId !== orderId) {
        console.error(`[webhook] orderId mismatch: webhook=${orderId}, verified=${verifiedOrderId}`)
        return NextResponse.json({ error: 'Некорректные данные платежа' }, { status: 400 })
      }

      // Идемпотентность — ЮKassa может прислать один webhook несколько раз
      const existingOrder = await db.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      })

      if (!existingOrder) {
        console.error(`[webhook] Order not found: ${orderId}`)
        return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
      }

      if (existingOrder.status === 'PAID') {
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

      // Обновляем счётчики продаж/выручки авторов.
      // Суммируем через Prisma.Decimal (Decimal.js) — точная арифметика без
      // погрешности JS number. Группируем по автору на случай если в заказе
      // несколько товаров одного автора, чтобы сделать один upsert на автора.
      const perAuthor = new Map<string, { sales: number; revenue: Prisma.Decimal }>()
      for (const item of order.items) {
        const authorId = item.product.authorId
        const entry = perAuthor.get(authorId) ?? {
          sales:   0,
          revenue: new Prisma.Decimal(0),
        }
        entry.sales += 1
        // .plus() — метод Decimal.js, точное сложение без погрешности
        entry.revenue = entry.revenue.plus(item.price)
        perAuthor.set(authorId, entry)
      }

      await Promise.all(
        Array.from(perAuthor.entries()).map(([authorId, { sales, revenue }]) =>
          db.authorProfile.upsert({
            where: { userId: authorId },
            update: {
              totalSales:   { increment: sales },
              // revenue — Prisma.Decimal, передаём напрямую в increment.
              // PostgreSQL выполнит сложение на стороне БД точно.
              totalRevenue: { increment: revenue },
            },
            create: {
              userId:       authorId,
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

      // Уведомляем авторов о продаже.
      // sendSaleNotificationEmail принимает amount: number — конвертируем
      // Decimal в number только здесь, для отображения в тексте письма.
      // Точность не критична: результат идёт в строку письма, не в БД.
      for (const item of order.items) {
        const author = item.product.author
        if (author.email) {
          try {
            await sendSaleNotificationEmail(
              author.email,
              author.name ?? 'Автор',
              item.product.name,
              Number(item.price),
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

function isYookassaIp(ip: string, allowlist: string[]): boolean {
  return ipRangeCheck(ip, allowlist)
}
