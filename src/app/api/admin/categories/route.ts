// src/app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, emoji } = await request.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const maxOrder = await db.category.aggregate({ _max: { order: true } })

  const category = await db.category.create({
    data: { name, slug, emoji: emoji ?? '📦', order: (maxOrder._max.order ?? 0) + 1 },
  })

  return NextResponse.json(category)
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
