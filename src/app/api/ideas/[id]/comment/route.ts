// src/app/api/ideas/[id]/comment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const schema = z.object({ text: z.string().min(1).max(2000) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const idea = await db.idea.findUnique({
      where:  { id },
      select: { moderationStatus: true, title: true },
    })
    if (!idea || idea.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Идея не найдена' }, { status: 404 })
    }

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
    }

    const comment = await db.ideaComment.create({
      data: {
        ideaId:           id,
        userId:           session.user.id,
        text:             parsed.data.text,
        moderationStatus: 'PENDING',
      },
      select: { id: true },
    })

    // Notify moderators
    const moderators = await db.user.findMany({
      where:  { OR: [{ isModerator: true }, { role: 'admin' }], isBanned: false },
      select: { id: true },
    })
    if (moderators.length > 0) {
      await db.notification.createMany({
        data: moderators.map(m => ({
          userId:  m.id,
          type:    'new_idea_comment',
          title:   'Новый комментарий к идее',
          message: `Комментарий к идее «${idea.title}»`,
          link:    '/admin/ideas/comments',
        })),
      })
    }

    return NextResponse.json({ id: comment.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/ideas/[id]/comment]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
