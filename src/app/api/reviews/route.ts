// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId, rating, text } = await req.json()

    if (!productId || !rating) {
      return NextResponse.json({ error: 'productId и rating обязательны' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Рейтинг должен быть от 1 до 5' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
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

    // Проверяем что отзыв ещё не оставлен
    const existing = await db.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв' }, { status: 400 })
    }

    const review = await db.review.create({
      data: { userId: session.user.id, productId, rating, text: text || null },
      include: { user: { select: { name: true } } },
    })

    return NextResponse.json({
      id: review.id, rating: review.rating, text: review.text,
      createdAt: review.createdAt, user: { name: review.user.name },
    }, { status: 201 })

  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
