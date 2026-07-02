// src/app/api/admin/ideas/count/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const count = await db.idea.count({ where: { moderationStatus: 'PENDING' } })
  return NextResponse.json({ count })
}
