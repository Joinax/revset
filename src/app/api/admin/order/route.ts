// src/app/api/admin/order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orderId, status } = await request.json()
  const validStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED']

  if (!orderId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  await db.order.update({ where: { id: orderId }, data: { status } })
  return NextResponse.json({ ok: true })
}
