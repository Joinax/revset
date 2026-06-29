import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const count = await db.pack.count({
    where: { moderationStatus: { in: ['PENDING', 'PENDING_SCAN'] } },
  })

  return NextResponse.json({ count })
}
