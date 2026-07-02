// src/app/api/faq/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const articles = await db.faqArticle.findMany({
      where: {
        isPublished: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id:         true,
        question:   true,
        answer:     true,
        category:   true,
        helpfulYes: true,
        helpfulNo:  true,
        position:   true,
      },
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('[GET /api/faq] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
