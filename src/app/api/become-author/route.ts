// src/app/api/become-author/route.ts
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

    // Проверяем что пользователь ещё не автор
    const user = await db.user.findUnique({
      where:   { id: session.user.id },
      include: { authorProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role === 'author') {
      return NextResponse.json({ error: 'Вы уже являетесь автором' }, { status: 400 })
    }

    const { bio, city } = await req.json()

    // Меняем роль и создаём профиль автора
    await db.user.update({
      where: { id: session.user.id },
      data: {
        role: 'author',
        authorProfile: {
          create: {
            bio:          bio  || null,
            city:         city || null,
            isVerified:   false,
            acceptOrders: false,
          },
        },
      },
    })

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Become author error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
