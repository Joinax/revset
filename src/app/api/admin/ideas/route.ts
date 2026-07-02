// src/app/api/admin/ideas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { logAdminAction } from '@/lib/audit-log'

const moderateSchema = z.object({
  id:                z.string(),
  action:            z.enum(['approve', 'reject', 'set_status']),
  moderationComment: z.string().max(1000).optional(),
  status:            z.enum(['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'DONE', 'DECLINED']).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') ?? 'PENDING'

  const ideas = await db.idea.findMany({
    where:   { moderationStatus: statusFilter as any },
    orderBy: { createdAt: 'asc' },
    include: {
      user:    { select: { name: true, email: true } },
      _count:  { select: { comments: true, votes: true } },
    },
  })

  return NextResponse.json(ideas.map(i => ({
    id:               i.id,
    number:           i.number,
    title:            i.title,
    description:      i.description,
    category:         i.category,
    moderationStatus: i.moderationStatus,
    moderationComment: i.moderationComment,
    status:           i.status,
    voteCount:        i.voteCount,
    commentCount:     i._count.comments,
    createdAt:        i.createdAt.toISOString(),
    author:           { name: i.user.name, email: i.user.email },
    userId:           i.userId,
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

  const { id, action, moderationComment, status } = parsed.data

  const idea = await db.idea.findUnique({ where: { id }, select: { userId: true, title: true, moderationStatus: true } })
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.idea.update({ where: { id }, data: { moderationStatus: 'APPROVED', moderationComment: null } })
    await logAdminAction({ adminId: session.user.id, action: 'idea.approve', targetType: 'Idea', targetId: id })
    await db.notification.create({
      data: {
        userId:  idea.userId,
        type:    'idea_approved',
        title:   'Идея одобрена',
        message: `Ваша идея «${idea.title}» прошла модерацию и опубликована`,
        link:    '/ideas',
      },
    })
  } else if (action === 'reject') {
    await db.idea.update({ where: { id }, data: { moderationStatus: 'REJECTED', moderationComment: moderationComment ?? null } })
    await logAdminAction({ adminId: session.user.id, action: 'idea.reject', targetType: 'Idea', targetId: id, details: { reason: moderationComment } })
    await db.notification.create({
      data: {
        userId:  idea.userId,
        type:    'idea_rejected',
        title:   'Идея отклонена',
        message: moderationComment ? `Ваша идея «${idea.title}» отклонена: ${moderationComment}` : `Ваша идея «${idea.title}» отклонена`,
        link:    '/account?tab=support',
      },
    })
  } else if (action === 'set_status') {
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })
    await db.idea.update({ where: { id }, data: { status } })
    await logAdminAction({ adminId: session.user.id, action: 'idea.status_change', targetType: 'Idea', targetId: id, details: { status } })
  }

  return NextResponse.json({ ok: true })
}
