// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20), 50)

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    }),
    db.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ])

  return NextResponse.json({
    notifications: notifications.map(n => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      message:   n.message,
      link:      n.link,
      isRead:    n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  })
}
