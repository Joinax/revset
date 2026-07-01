// src/app/api/support/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { logAdminAction } from '@/lib/audit-log'

const reassignSchema = z.object({
  agentId: z.string(),
})

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

    // Atomic: only take if assignedTo IS NULL
    const updated = await db.supportTicket.updateMany({
      where: { id: ticketId, assignedTo: null },
      data:  { assignedTo: session.user.id, updatedAt: new Date() },
    })

    if (updated.count === 0) {
      // Either ticket not found or already assigned
      const ticket = await db.supportTicket.findUnique({
        where:  { id: ticketId },
        select: { assignedTo: true },
      })
      if (!ticket) {
        return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Тикет уже назначен' }, { status: 409 })
    }

    await logAdminAction({
      adminId:    session.user.id,
      action:     'ticket.assign',
      targetType: 'SupportTicket',
      targetId:   ticketId,
      details:    { assignedTo: session.user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/support/[id]/assign] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

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

    // Reassign is admin-only
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = reassignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }

    const { agentId } = parsed.data

    // Verify target agent exists and is support/admin
    const agent = await db.user.findUnique({
      where:  { id: agentId },
      select: { id: true, isSupport: true, role: true, isBanned: true },
    })
    if (!agent || agent.isBanned) {
      return NextResponse.json({ error: 'Агент не найден' }, { status: 400 })
    }
    if (!agent.isSupport && agent.role !== 'admin') {
      return NextResponse.json({ error: 'Пользователь не является агентом поддержки' }, { status: 400 })
    }

    const ticket = await db.supportTicket.findUnique({
      where:  { id: ticketId },
      select: { id: true, assignedTo: true },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    await db.supportTicket.update({
      where: { id: ticketId },
      data:  { assignedTo: agentId, updatedAt: new Date() },
    })

    await logAdminAction({
      adminId:    session.user.id,
      action:     'ticket.reassign',
      targetType: 'SupportTicket',
      targetId:   ticketId,
      details:    { from: ticket.assignedTo, to: agentId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/support/[id]/assign] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
