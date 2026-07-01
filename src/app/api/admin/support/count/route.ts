// src/app/api/admin/support/count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true, isSupport: true, isModerator: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!can(currentUser, 'support')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const count = await db.supportTicket.count({
      where: {
        status:     'AWAITING_SUPPORT',
        assignedTo: null,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[GET /api/admin/support/count] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
