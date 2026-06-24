// src/app/api/become-author/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const MAX_BIO_LENGTH  = 1000
const MAX_CITY_LENGTH = 100

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

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
    if (user.authorProfile) {
      return NextResponse.json({ error: 'Заявка уже отправлена и ожидает рассмотрения' }, { status: 400 })
    }

    const becomeAuthorSchema = z.object({
      bio:  z.string().max(MAX_BIO_LENGTH,  `Bio не должно превышать ${MAX_BIO_LENGTH} символов`).optional().nullable(),
      city: z.string().max(MAX_CITY_LENGTH, `Город не должен превышать ${MAX_CITY_LENGTH} символов`).optional().nullable(),
    })

    let bio: string | null | undefined, city: string | null | undefined
    try {
      const result = becomeAuthorSchema.safeParse(await req.json())
      if (!result.success) {
        return NextResponse.json(
          { error: 'Некорректные данные', details: result.error.flatten().fieldErrors },
          { status: 400 }
        )
      }
      ;({ bio, city } = result.data)
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    await db.authorProfile.create({
      data: {
        userId:       session.user.id,
        bio:          bio?.trim()  || null,
        city:         city?.trim() || null,
        isVerified:   false,
        acceptOrders: false,
      },
    })

    revalidatePath('/admin/verification')

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Become author error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
