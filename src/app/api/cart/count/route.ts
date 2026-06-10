// src/app/api/cart/count/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ count: 0 })

  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    select: { _count: { select: { items: true } } },
  })

  return NextResponse.json({ count: cart?._count.items ?? 0 })
}
