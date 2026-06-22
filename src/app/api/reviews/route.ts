// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const MAX_REVIEW_LENGTH = 2000

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId, rating, text } = await req.json()

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 })
    }

    // rating должен быть целым числом от 1 до 5
    const ratingNum = Number(rating)
    if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Рейтинг должен быть целым числом от 1 до 5' }, { status: 400 })
    }

    if (text !== undefined && text !== null) {
      if (typeof text !== 'string') {
        return NextResponse.json({ error: 'Некорректный текст отзыва' }, { status: 400 })
      }
      if (text.length > MAX_REVIEW_LENGTH) {
        return NextResponse.json({ error: `Отзыв не должен превышать ${MAX_REVIEW_LENGTH} символов` }, { status: 400 })
      }
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    // Автор не может оставить отзыв на свой товар
    if (product.authorId === session.user.id) {
      return NextResponse.json({ error: 'Нельзя оставить отзыв на собственный товар' }, { status: 403 })
    }

    // Платный товар — только после покупки
    if (product.price !== null) {
      const order = await db.order.findFirst({
        where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
      })
      if (!order) {
        return NextResponse.json({ error: 'Отзыв можно оставить только после покупки' }, { status: 403 })
      }
    }

    const existing = await db.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
    })

    // Если отзыв уже существует:
    // - APPROVED/PENDING — нельзя отправить повторно
    // - REJECTED — разрешаем обновить и отправить на повторную модерацию
    if (existing) {
      if (existing.moderationStatus !== 'REJECTED') {
        return NextResponse.json({ error: 'Вы уже оставили отзыв' }, { status: 400 })
      }

      const review = await db.review.update({
        where: { id: existing.id },
        data:  { rating: ratingNum, text: text?.trim() || null, moderationStatus: 'PENDING', moderationComment: null },
        include: { user: { select: { name: true } } },
      })

      return NextResponse.json({
        id: review.id, rating: review.rating, text: review.text,
        moderationStatus: review.moderationStatus,
        createdAt: review.createdAt, user: { name: review.user.name },
      }, { status: 200 })
    }

    const review = await db.review.create({
      data: { userId: session.user.id, productId, rating: ratingNum, text: text?.trim() || null, moderationStatus: 'PENDING' },
      include: { user: { select: { name: true } } },
    })

return NextResponse.json({
      id: review.id, rating: review.rating, text: review.text,
      moderationStatus: review.moderationStatus,
      createdAt: review.createdAt, user: { name: review.user.name },
    }, { status: 201 })

  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
