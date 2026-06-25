import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit-log'

const schema = z.object({
  reviewId:          z.string().min(1).max(50),
  action:            z.enum(['approve', 'reject']),
  moderationComment: z.string().max(500).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { reviewId, action, moderationComment } = parsed.data

  const review = await db.packReview.findUnique({
    where: { id: reviewId },
    include: { pack: { select: { id: true, name: true, authorId: true } }, user: { select: { id: true, name: true } } },
  })
  if (!review) return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })

  const moderationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await db.packReview.update({
    where: { id: reviewId },
    data: {
      moderationStatus,
      moderationComment: moderationStatus === 'REJECTED' ? (moderationComment?.trim() || null) : null,
    },
  })

  if (moderationStatus === 'APPROVED') {
    await db.notification.create({
      data: {
        userId:  review.pack.authorId,
        type:    'new_pack_review',
        title:   'Новый отзыв на ваш пак',
        message: `${review.user.name ?? 'Покупатель'} оставил отзыв на «${review.pack.name}»`,
        link:    `/pack/${review.pack.id}`,
      },
    }).catch(() => {})
  }

  await db.notification.create({
    data: {
      userId:  review.userId,
      type:    moderationStatus === 'APPROVED' ? 'pack_review_approved' : 'pack_review_rejected',
      title:   moderationStatus === 'APPROVED' ? 'Отзыв опубликован' : 'Отзыв отклонён',
      message: moderationStatus === 'APPROVED'
        ? `Ваш отзыв на «${review.pack.name}» опубликован.`
        : `Ваш отзыв на «${review.pack.name}» отклонён.`,
      link: `/pack/${review.pack.id}`,
    },
  }).catch(() => {})

  await logAdminAction({
    adminId:    session.user.id,
    action:     action === 'approve' ? 'pack_review.approve' : 'pack_review.reject',
    targetType: 'PackReview',
    targetId:   reviewId,
    details:    { moderationStatus },
  })

  return NextResponse.json({ ok: true })
}
