// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const MAX_NAME_LENGTH = 100

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { name } = await req.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 })
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Имя не должно превышать ${MAX_NAME_LENGTH} символов` }, { status: 400 })
    }

    const user = await db.user.update({
      where:  { id: session.user.id },
      data:   { name: name.trim() },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
