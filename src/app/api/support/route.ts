// src/app/api/support/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { TICKET_CATEGORIES, type TicketCategoryKey } from '@/lib/ticket-categories'

const STATUS_LABELS: Record<string, string> = {
  AWAITING_SUPPORT: 'На рассмотрении',
  AWAITING_USER:    'Требуется ваш ответ',
  CLOSED:           'Закрыт',
}

const createSchema = z.object({
  subject:  z.string().min(5).max(200),
  category: z.enum(Object.keys(TICKET_CATEGORIES) as [TicketCategoryKey, ...TicketCategoryKey[]]),
  text:     z.string().min(10).max(5000),
  orderId:  z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true, isSupport: true, isModerator: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isStaff = can(currentUser, 'support')
    const isAdmin = req.nextUrl.searchParams.get('admin') === '1'

    // Admin/support mode: return all tickets (including closed) + stats
    if (isAdmin && isStaff) {
      const [tickets, stats] = await Promise.all([
        db.supportTicket.findMany({
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          select: {
            id: true, number: true, subject: true, category: true,
            priority: true, status: true, assignedTo: true,
            guestEmail: true,
            updatedAt: true, createdAt: true,
            _count: { select: { messages: true } },
          },
        }),
        db.supportTicket.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
      ])

      const statsMap = Object.fromEntries(stats.map(s => [s.status, s._count._all]))

      return NextResponse.json({
        tickets: tickets.map(t => ({
          id: t.id, number: t.number, subject: t.subject,
          category: t.category, priority: t.priority, status: t.status,
          assignedTo: t.assignedTo, guestEmail: t.guestEmail,
          updatedAt: t.updatedAt.toISOString(), createdAt: t.createdAt.toISOString(),
          messageCount: t._count.messages,
        })),
        stats: {
          total:    tickets.length,
          open:     (statsMap['AWAITING_SUPPORT'] ?? 0) + (statsMap['AWAITING_USER'] ?? 0),
          closed:   statsMap['CLOSED'] ?? 0,
          unassigned: tickets.filter(t => !t.assignedTo && t.status !== 'CLOSED').length,
        },
      })
    }

    // User mode: own tickets only
    const tickets = await db.supportTicket.findMany({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id:        true,
        number:    true,
        subject:   true,
        category:  true,
        status:    true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      tickets.map((t) => ({
        ...t,
        statusLabel: STATUS_LABELS[t.status] ?? t.status,
      }))
    )
  } catch (error) {
    console.error('[GET /api/support] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true, isSupport: true, isModerator: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }
    const { subject, category, text, orderId } = parsed.data

    // Rate-limit: max 5 open tickets
    const openCount = await db.supportTicket.count({
      where: {
        userId: session.user.id,
        status: { not: 'CLOSED' },
      },
    })
    if (openCount >= 5) {
      return NextResponse.json({ error: 'Превышен лимит открытых обращений (5)' }, { status: 429 })
    }

    // Verify order belongs to user
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, select: { userId: true } })
      if (!order || order.userId !== session.user.id) {
        return NextResponse.json({ error: 'Заказ не найден' }, { status: 400 })
      }
    }

    // Priority derived from category — NEVER from client body
    const priority = TICKET_CATEGORIES[category].priority

    const ticket = await db.supportTicket.create({
      data: {
        userId:   session.user.id,
        subject,
        category,
        priority,
        status:   'AWAITING_SUPPORT',
        orderId:  orderId ?? null,
        messages: {
          create: {
            authorId: session.user.id,
            isStaff:  false,
            text,
          },
        },
      },
      select: { id: true, number: true },
    })

    // Notify all support users and admins
    const supportUsers = await db.user.findMany({
      where: {
        OR: [
          { isSupport: true },
          { role: 'admin' },
        ],
        isBanned: false,
      },
      select: { id: true },
    })

    if (supportUsers.length > 0) {
      await db.notification.createMany({
        data: supportUsers.map((u) => ({
          userId:  u.id,
          type:    'new_ticket',
          title:   'Новое обращение',
          message: `Новое обращение #${ticket.number}: ${subject}`,
          link:    `/admin/support/${ticket.id}`,
        })),
      })
    }

    return NextResponse.json({ id: ticket.id, number: ticket.number }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/support] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
