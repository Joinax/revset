// src/app/api/support/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'

const STATUS_LABELS: Record<string, string> = {
  AWAITING_SUPPORT: 'На рассмотрении',
  AWAITING_USER:    'Требуется ваш ответ',
  CLOSED:           'Закрыт',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

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

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: isStaff ? undefined : { isInternal: false },
          include: {
            attachments: true,
            author: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    // Access check: owner or support staff (guest tickets: staff only)
    const isOwner = ticket.userId !== null && ticket.userId === session.user.id
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update readAt
    const now = new Date()
    if (isOwner && !isStaff) {
      await db.supportTicket.update({
        where: { id: ticketId },
        data:  { userReadAt: now },
      })
    } else if (isStaff) {
      await db.supportTicket.update({
        where: { id: ticketId },
        data:  { staffReadAt: now },
      })
    }

    if (isStaff) {
      return NextResponse.json(ticket)
    }

    // Non-staff: omit priority, map status label
    const { priority: _priority, ...ticketWithoutPriority } = ticket
    return NextResponse.json({
      ...ticketWithoutPriority,
      statusLabel: STATUS_LABELS[ticket.status] ?? ticket.status,
    })
  } catch (error) {
    console.error('[GET /api/support/[id]] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
