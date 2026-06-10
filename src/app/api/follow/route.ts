// src/app/api/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { authorId } = await req.json()
  if (!authorId) return NextResponse.json({ error: 'authorId required' }, { status: 400 })
  if (authorId === session.user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  await db.follow.create({
    data: { followerId: session.user.id, followingId: authorId },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { authorId } = await req.json()

  await db.follow.deleteMany({
    where: { followerId: session.user.id, followingId: authorId },
  })

  return NextResponse.json({ ok: true })
}
