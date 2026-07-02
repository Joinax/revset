// src/app/api/admin/ideas/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { logAdminAction } from '@/lib/audit-log'

const moderateSchema = z.object({
  id:     z.string(),
  action: z.enum(['approve', 'reject']),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const comments = await db.ideaComment.findMany({
    where:   { moderationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true } },
      idea: { select: { id: true, title: true, number: true } },
    },
  })

  return NextResponse.json(comments.map(c => ({
    id:        c.id,
    text:      c.text,
    createdAt: c.createdAt.toISOString(),
    author:    { name: c.user.name },
    idea:      { id: c.idea.id, title: c.idea.title, number: c.idea.number },
  })))
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = moderateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  const { id, action } = parsed.data

  await db.ideaComment.update({
    where: { id },
    data:  { moderationStatus: action === 'approve' ? 'APPROVED' : 'REJECTED' },
  })

  await logAdminAction({
    adminId:    session.user.id,
    action:     action === 'approve' ? 'idea_comment.approve' : 'idea_comment.reject',
    targetType: 'IdeaComment',
    targetId:   id,
  })

  return NextResponse.json({ ok: true })
}
