// src/app/api/admin/review-comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Роль проверяем из БД — сессия может содержать устаревшую роль
  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })

  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { commentId, action, moderationComment } = await request.json()

  if (!commentId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const comment = await db.reviewComment.findUnique({
    where:   { id: commentId },
    include: { review: { include: { product: { select: { name: true } } } } },
  })

  if (!comment) {
    return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
  }

  const moderationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await db.reviewComment.update({
    where: { id: commentId },
    data: {
      moderationStatus,
      moderationComment: moderationStatus === 'REJECTED'
        ? (moderationComment?.trim() || null)
        : null,
    },
  })

  await db.notification.create({
    data: {
      userId:  comment.authorId,
      type:    moderationStatus === 'APPROVED' ? 'product_approved' : 'product_rejected',
      title:   moderationStatus === 'APPROVED' ? 'Ответ на отзыв опубликован' : 'Ответ на отзыв отклонён',
      message: moderationStatus === 'APPROVED'
        ? `Ваш ответ на отзыв к «${comment.review.product.name}» прошёл модерацию и опубликован.`
        : moderationComment?.trim()
          ? `Ваш ответ на отзыв к «${comment.review.product.name}» отклонён: ${moderationComment.trim()}`
          : `Ваш ответ на отзыв к «${comment.review.product.name}» отклонён модератором.`,
      link: '/account?tab=author-reviews',
    },
  })

  await logAdminAction({
    adminId:    session.user.id,
    action:     action === 'approve' ? 'product.publish' : 'product.unpublish',
    targetType: 'Product',
    targetId:   commentId,
    details:    { type: 'review_comment', moderationStatus },
  })

  return NextResponse.json({ ok: true })
}
