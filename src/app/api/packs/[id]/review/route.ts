import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text:   z.string().min(1).max(2000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packId } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pack = await db.pack.findUnique({ where: { id: packId }, select: { id: true, moderationStatus: true } })
    if (!pack || pack.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Пак не найден' }, { status: 404 })
    }

    const downloaded = await db.downloadLog.findFirst({ where: { userId: session.user.id, packId } })
    if (!downloaded) {
      return NextResponse.json({ error: 'Скачайте пак чтобы оставить отзыв' }, { status: 403 })
    }

    const existing = await db.packReview.findUnique({
      where: { packId_userId: { packId, userId: session.user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв на этот пак' }, { status: 409 })
    }

    const parsed = reviewSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const review = await db.packReview.create({
      data: {
        packId,
        userId: session.user.id,
        rating: parsed.data.rating,
        text:   parsed.data.text,
        moderationStatus: 'PENDING',
      },
    })

    return NextResponse.json({ reviewId: review.id }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
