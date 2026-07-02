// src/app/api/ideas/[id]/vote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      select: { moderationStatus: true },
    })
    if (!idea || idea.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Идея не найдена' }, { status: 404 })
    }

    const existing = await db.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
    })

    let voted: boolean
    let updatedIdea: { voteCount: number }

    if (existing) {
      // Remove vote
      await db.$transaction([
        db.ideaVote.delete({ where: { ideaId_userId: { ideaId: id, userId: session.user.id } } }),
        db.idea.update({ where: { id }, data: { voteCount: { decrement: 1 } } }),
      ])
      const after = await db.idea.findUnique({ where: { id }, select: { voteCount: true } })
      voted        = false
      updatedIdea  = { voteCount: Math.max(0, after?.voteCount ?? 0) }
    } else {
      // Add vote
      await db.$transaction([
        db.ideaVote.create({ data: { ideaId: id, userId: session.user.id } }),
        db.idea.update({ where: { id }, data: { voteCount: { increment: 1 } } }),
      ])
      const after = await db.idea.findUnique({ where: { id }, select: { voteCount: true } })
      voted       = true
      updatedIdea = { voteCount: after?.voteCount ?? 1 }
    }

    return NextResponse.json({ voted, voteCount: updatedIdea.voteCount })
  } catch (err) {
    console.error('[POST /api/ideas/[id]/vote]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
