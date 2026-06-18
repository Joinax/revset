// src/app/api/admin/order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

const validStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED']

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orderId, status } = await request.json()

  if (!orderId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: {
        select: {
          price: true,
          product: { select: { authorId: true } },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const oldStatus = order.status
  if (oldStatus === status) {
    return NextResponse.json({ ok: true })
  }

  const wasPaid = oldStatus === 'PAID'
  const willBePaid = status === 'PAID'

  // Пересчитываем продажи/выручку авторов только если статус PAID
  // появляется или исчезает — переходы между другими статусами не влияют
  if (wasPaid !== willBePaid) {
    const direction = willBePaid ? 1 : -1

    // Группируем по автору — на случай если в заказе несколько товаров одного автора
    const perAuthor = new Map<string, { sales: number; revenue: number }>()
    for (const item of order.items) {
      const authorId = item.product.authorId
      const entry = perAuthor.get(authorId) ?? { sales: 0, revenue: 0 }
      entry.sales += 1
      entry.revenue += item.price
      perAuthor.set(authorId, entry)
    }

    await db.$transaction([
      db.order.update({ where: { id: orderId }, data: { status } }),
      ...Array.from(perAuthor.entries()).map(([authorId, { sales, revenue }]) =>
        db.authorProfile.upsert({
          where: { userId: authorId },
          update: {
            totalSales:   { increment: direction * sales },
            totalRevenue: { increment: direction * revenue },
          },
          // На случай если у автора почему-то ещё нет профиля —
          // создаём с нулевыми значениями, увеличенными только если direction положительный
          // (если direction отрицательный и профиля не было, отрицательные значения не имеют смысла —
          // используем Math.max(0, ...) для защиты)
          create: {
            userId: authorId,
            totalSales:   Math.max(0, direction * sales),
            totalRevenue: Math.max(0, direction * revenue),
          },
        })
      ),
    ])
  } else {
    await db.order.update({ where: { id: orderId }, data: { status } })
  }

  await logAdminAction({
    adminId: session.user.id,
    action: 'order.status_change',
    targetType: 'Order',
    targetId: orderId,
    details: { from: oldStatus, to: status },
  })

  return NextResponse.json({ ok: true })
}
