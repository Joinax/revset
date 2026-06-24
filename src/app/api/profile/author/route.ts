// src/app/api/profile/author/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const MAX_NAME_LENGTH = 100

const authorProfileSchema = z.object({
  name: z.string().min(1, 'Имя не может быть пустым').max(MAX_NAME_LENGTH, `Имя не должно превышать ${MAX_NAME_LENGTH} символов`).trim(),
  city: z.string().max(100).optional(),
  bio:  z.string().max(1000).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    if (session.user.role !== 'author') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const parsed = authorProfileSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.name?.[0] ?? 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { name, city, bio } = parsed.data

    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data:  { name },
      }),
      db.authorProfile.update({
        where: { userId: session.user.id },
        data: {
          city: city?.trim() || null,
          bio:  bio?.trim()  || null,
        },
      }),
    ])

    return NextResponse.json({ ok: true, name })

  } catch (error) {
    console.error('Author profile update error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
