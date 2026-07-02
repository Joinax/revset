// src/app/api/admin/faq/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'

const createSchema = z.object({
  question:    z.string().min(3).max(300),
  answer:      z.string().min(3).max(5000),
  category:    z.string().optional(),
  position:    z.number().int().optional(),
  isPublished: z.boolean().optional(),
})

async function getAuthorizedUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!user || user.isBanned) return null
  if (!can(user, 'support')) return null
  return { session, user }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedUser(req)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const articles = await db.faqArticle.findMany({
      orderBy: [{ position: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('[GET /api/admin/faq] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthorizedUser(req)
    if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }

    const article = await db.faqArticle.create({
      data: {
        question:    parsed.data.question,
        answer:      parsed.data.answer,
        category:    parsed.data.category ?? null,
        position:    parsed.data.position ?? 0,
        isPublished: parsed.data.isPublished ?? true,
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/faq] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
