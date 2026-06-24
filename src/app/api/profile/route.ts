// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const MAX_NAME_LENGTH = 100

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const profileSchema = z.object({
      name: z.string().min(1, 'Имя не может быть пустым').max(MAX_NAME_LENGTH, `Имя не должно превышать ${MAX_NAME_LENGTH} символов`).trim(),
    })

    let name: string
    try {
      const result = profileSchema.safeParse(await req.json())
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.flatten().fieldErrors.name?.[0] ?? 'Некорректные данные' },
          { status: 400 }
        )
      }
      name = result.data.name
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
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
