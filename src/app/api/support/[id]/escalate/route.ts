// src/app/api/support/[id]/escalate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { logAdminAction } from '@/lib/audit-log'

export async function POST(
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

    if (!can(currentUser, 'support')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticket = await db.supportTicket.findUnique({
      where:  { id: ticketId },
      select: { id: true, priority: true },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    if (ticket.priority !== 'URGENT') {
      await db.supportTicket.update({
        where: { id: ticketId },
        data:  { priority: 'URGENT', updatedAt: new Date() },
      })

      await logAdminAction({
        adminId:    session.user.id,
        action:     'ticket.escalate',
        targetType: 'SupportTicket',
        targetId:   ticketId,
        details:    { from: ticket.priority, to: 'URGENT' },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/support/[id]/escalate] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
