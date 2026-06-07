// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Добавить в избранное
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 })
    }

    const favorite = await db.favorite.upsert({
      where:  { userId_productId: { userId: session.user.id, productId } },
      update: {},
      create: { userId: session.user.id, productId },
    })

    return NextResponse.json({ id: favorite.id }, { status: 201 })

  } catch (error) {
    console.error('Favorite error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// Удалить из избранного
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 })
    }

    await db.favorite.deleteMany({
      where: { userId: session.user.id, productId },
    })

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Favorite error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
