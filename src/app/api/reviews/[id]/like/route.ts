// src/app/api/reviews/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Роль и бан из БД — сессия может содержать устаревшие данные
    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })

    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    if (currentUser.role !== 'author' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Только авторы могут ставить лайки' }, { status: 403 })
    }

    const { id: reviewId } = await params

    const review = await db.review.findUnique({
      where:   { id: reviewId },
      include: { product: { select: { authorId: true } } },
    })

    if (!review || review.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    // Только автор этого конкретного товара может ставить лайк
    if (review.product.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Только автор товара может ставить лайки' }, { status: 403 })
    }

    const existing = await db.reviewLike.findUnique({
      where: { reviewId_authorId: { reviewId, authorId: session.user.id } },
    })

    if (existing) {
      await db.reviewLike.delete({ where: { id: existing.id } })
      return NextResponse.json({ liked: false })
    } else {
      await db.reviewLike.create({ data: { reviewId, authorId: session.user.id } })
      return NextResponse.json({ liked: true })
    }

  } catch (error) {
    console.error('Review like error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
