// src/app/api/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { authorId } = await req.json()
  if (!authorId || typeof authorId !== 'string') {
    return NextResponse.json({ error: 'authorId required' }, { status: 400 })
  }
  if (authorId === session.user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  // Проверяем что подписываемся на реально существующего пользователя
  const target = await db.user.findUnique({
    where: { id: authorId },
    select: { id: true },
  })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // upsert вместо create — защита от дублей если клиент отправит запрос дважды
  await db.follow.upsert({
    where:  { followerId_followingId: { followerId: session.user.id, followingId: authorId } },
    create: { followerId: session.user.id, followingId: authorId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { authorId } = await req.json()
  if (!authorId || typeof authorId !== 'string') {
    return NextResponse.json({ error: 'authorId required' }, { status: 400 })
  }

  await db.follow.deleteMany({
    where: { followerId: session.user.id, followingId: authorId },
  })

  return NextResponse.json({ ok: true })
}
