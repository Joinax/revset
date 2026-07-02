// src/app/api/faq/[id]/helpful/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const voteSchema = z.object({
  vote: z.enum(['yes', 'no']),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
    }

    const article = await db.faqArticle.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!article) {
      return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 })
    }

    const updated = await db.faqArticle.update({
      where: { id },
      data:  parsed.data.vote === 'yes'
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo:  { increment: 1 } },
      select: { helpfulYes: true, helpfulNo: true },
    })

    return NextResponse.json({ ok: true, helpfulYes: updated.helpfulYes, helpfulNo: updated.helpfulNo })
  } catch (error) {
    console.error('[POST /api/faq/[id]/helpful] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
