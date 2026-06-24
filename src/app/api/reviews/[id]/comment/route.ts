// src/app/api/reviews/[id]/comment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const MAX_COMMENT_LENGTH = 1000

// Минимальный интервал между повторными отправками комментария — 5 минут
// Защита от спама модераторов бесконечными переотправками
const RESUBMIT_COOLDOWN_MS = 5 * 60 * 1000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Роль и бан из БД
    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })

    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    if (currentUser.role !== 'author' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Только авторы могут оставлять комментарии' }, { status: 403 })
    }

    const { id: reviewId } = await params

    const commentSchema = z.object({
      text: z.string().min(1, 'Текст комментария обязателен').max(MAX_COMMENT_LENGTH, `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов`).trim(),
    })

    let text: string
    try {
      const result = commentSchema.safeParse(await req.json())
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.flatten().fieldErrors.text?.[0] ?? 'Некорректные данные' },
          { status: 400 }
        )
      }
      text = result.data.text
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    const review = await db.review.findUnique({
      where:   { id: reviewId },
      include: { product: { select: { authorId: true } } },
    })

    if (!review || review.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    if (review.product.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Только автор товара может оставлять комментарии' }, { status: 403 })
    }

    // Проверяем cooldown на повторную отправку — защита от спама модераторов
    const existing = await db.reviewComment.findUnique({
      where:  { reviewId_authorId: { reviewId, authorId: session.user.id } },
      select: { id: true, moderationStatus: true, updatedAt: true },
    })

    if (existing && existing.moderationStatus === 'PENDING') {
      const timeSinceUpdate = Date.now() - existing.updatedAt.getTime()
      if (timeSinceUpdate < RESUBMIT_COOLDOWN_MS) {
        const waitMinutes = Math.ceil((RESUBMIT_COOLDOWN_MS - timeSinceUpdate) / 60000)
        return NextResponse.json(
          { error: `Подождите ${waitMinutes} мин. перед повторной отправкой` },
          { status: 429 }
        )
      }
    }

    const comment = await db.reviewComment.upsert({
      where:  { reviewId_authorId: { reviewId, authorId: session.user.id } },
      create: { reviewId, authorId: session.user.id, text: text.trim(), moderationStatus: 'PENDING' },
      update: { text: text.trim(), moderationStatus: 'PENDING', moderationComment: null },
    })

    return NextResponse.json({ id: comment.id, moderationStatus: comment.moderationStatus }, { status: 201 })

  } catch (error) {
    console.error('Review comment error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { isBanned: true },
    })

    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id: reviewId } = await params

    await db.reviewComment.deleteMany({
      where: { reviewId, authorId: session.user.id },
    })

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Review comment delete error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
