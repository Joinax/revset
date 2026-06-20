// src/app/api/become-author/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const { bio, city } = await req.json()

    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') {
        return NextResponse.json({ error: 'Некорректное поле bio' }, { status: 400 })
      }
      if (bio.length > MAX_BIO_LENGTH) {
        return NextResponse.json({ error: `Bio не должно превышать ${MAX_BIO_LENGTH} символов` }, { status: 400 })
      }
    }

    if (city !== undefined && city !== null) {
      if (typeof city !== 'string') {
        return NextResponse.json({ error: 'Некорректное поле city' }, { status: 400 })
      }
      if (city.length > MAX_CITY_LENGTH) {
        return NextResponse.json({ error: `Город не должен превышать ${MAX_CITY_LENGTH} символов` }, { status: 400 })
      }
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
