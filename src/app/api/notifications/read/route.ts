// src/app/api/notifications/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  let id: string | undefined, all: boolean | undefined
  try {
    const body = await req.json()
    id  = body?.id
    all = body?.all
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  if (all) {
    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data:  { isRead: true },
    })
    return NextResponse.json({ ok: true })
  }

  if (!id) {
    return NextResponse.json({ error: 'Не указан id' }, { status: 400 })
  }

  // updateMany с userId в where — чтобы нельзя было отметить чужое уведомление
  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data:  { isRead: true },
  })

  return NextResponse.json({ ok: true })
}
