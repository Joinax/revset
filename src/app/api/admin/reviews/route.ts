// src/app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'
import { z } from 'zod'

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

  const reviewModerationSchema = z.object({
    reviewId:          z.string().min(1).max(50),
    action:            z.enum(['approve', 'reject']),
    moderationComment: z.string().max(500).optional().nullable(),
  })

  let reviewId: string, action: string, moderationComment: string | null | undefined
  try {
    const result = reviewModerationSchema.safeParse(await request.json())
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    ;({ reviewId, action, moderationComment } = result.data)
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, moderationStatus: true },
  })

  if (!review) {
    return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
  }

  const moderationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await db.review.update({
    where: { id: reviewId },
    data:  {
      moderationStatus,
      moderationComment: moderationStatus === 'REJECTED'
        ? (moderationComment?.trim() || null)
        : null,
    },
  })

  // Уведомляем автора товара когда отзыв одобрен
  if (moderationStatus === 'APPROVED') {
    const reviewData2 = await db.review.findUnique({
      where:   { id: reviewId },
      include: {
        user:    { select: { name: true } },
        product: { select: { id: true, name: true, authorId: true } },
      },
    })
    if (reviewData2) {
      await db.notification.create({
        data: {
          userId:  reviewData2.product.authorId,
          type:    'product_approved',
          title:   'Новый отзыв на вашу модель',
          message: `${reviewData2.user.name ?? 'Покупатель'} оставил отзыв на «${reviewData2.product.name}»`,
          link:    '/account?tab=author-reviews',
        },
      }).catch(() => {})
    }
  }

  // Уведомляем пользователя о результате модерации
  const reviewData = await db.review.findUnique({
    where:  { id: reviewId },
    select: { userId: true, product: { select: { id: true, name: true } } },
  })

  if (reviewData) {
    await db.notification.create({
      data: {
        userId:  reviewData.userId,
        type:    moderationStatus === 'APPROVED' ? 'product_approved' : 'product_rejected',
        title:   moderationStatus === 'APPROVED' ? 'Отзыв опубликован' : 'Отзыв отклонён',
        message: moderationStatus === 'APPROVED'
          ? `Ваш отзыв на «${reviewData.product.name}» прошёл модерацию и опубликован.`
          : moderationComment?.trim()
            ? `Ваш отзыв на «${reviewData.product.name}» отклонён: ${moderationComment.trim()}`
            : `Ваш отзыв на «${reviewData.product.name}» отклонён модератором.`,
        link: '/account?tab=my-reviews',
      },
    })
  }

  await logAdminAction({
    adminId:    session.user.id,
    action:     action === 'approve' ? 'product.publish' : 'product.unpublish',
    targetType: 'Product',
    targetId:   reviewId,
    details:    { type: 'review', moderationStatus },
  })

  return NextResponse.json({ ok: true })
}
