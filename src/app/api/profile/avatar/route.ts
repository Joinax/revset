// src/app/api/profile/avatar/route.ts
// POST убран — загрузка аватарки теперь через presigned URL (/api/upload + /api/upload/complete)
// Worker автоматически обновит user.image после проверки ClamAV
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { isBanned: true },
  })
  if (!user || user.isBanned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.user.update({
    where: { id: session.user.id },
    data:  { image: null },
  })

  return NextResponse.json({ ok: true })
}
