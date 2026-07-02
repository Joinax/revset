// src/app/api/admin/faq/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'

const patchSchema = z.object({
  question:    z.string().min(3).max(300).optional(),
  answer:      z.string().min(3).max(5000).optional(),
  category:    z.string().nullable().optional(),
  position:    z.number().int().optional(),
  isPublished: z.boolean().optional(),
})

async function getAuthorizedUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!user || user.isBanned) return null
  if (!can(user, 'support')) return null
  return user
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser()
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }

    const article = await db.faqArticle.findUnique({ where: { id }, select: { id: true } })
    if (!article) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    const updated = await db.faqArticle.update({
      where: { id },
      data:  parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/admin/faq/[id]] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser()
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const article = await db.faqArticle.findUnique({ where: { id }, select: { id: true } })
    if (!article) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    await db.faqArticle.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/admin/faq/[id]] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
