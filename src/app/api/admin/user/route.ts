// src/app/api/admin/user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await request.json()
  if (!userId || !['user', 'author', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  await db.user.update({ where: { id: userId }, data: { role } })
  return NextResponse.json({ ok: true })
}
