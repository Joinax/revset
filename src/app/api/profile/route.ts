// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { name } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data:  { name: name.trim() },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
