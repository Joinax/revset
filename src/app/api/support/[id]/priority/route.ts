// src/app/api/support/[id]/priority/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { logAdminAction } from '@/lib/audit-log'

const prioritySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json()
    const parsed = prioritySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }

    const { priority } = parsed.data
    await db.supportTicket.update({
      where: { id: ticketId },
      data:  { priority, updatedAt: new Date() },
    })

    await logAdminAction({
      adminId:    session.user.id,
      action:     'ticket.priority_change',
      targetType: 'SupportTicket',
      targetId:   ticketId,
      details:    { from: ticket.priority, to: priority },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/support/[id]/priority] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
