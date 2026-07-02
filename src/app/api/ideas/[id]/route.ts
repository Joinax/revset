// src/app/api/ideas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)

    const idea = await db.idea.findUnique({
      where:   { id },
      include: {
        comments: {
          where:   { moderationStatus: 'APPROVED' },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
        _count: { select: { comments: { where: { moderationStatus: 'APPROVED' } } } },
      },
    })

    if (!idea || idea.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let hasVoted = false
    if (session) {
      const vote = await db.ideaVote.findUnique({
        where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
      })
      hasVoted = !!vote
    }

    return NextResponse.json({
      id:           idea.id,
      number:       idea.number,
      title:        idea.title,
      description:  idea.description,
      category:     idea.category,
      voteCount:    idea.voteCount,
      commentCount: idea._count.comments,
      createdAt:    idea.createdAt.toISOString(),
      hasVoted,
      comments: idea.comments.map(c => ({
        id:        c.id,
        text:      c.text,
        createdAt: c.createdAt.toISOString(),
        author:    { name: c.user.name },
      })),
    })
  } catch (err) {
    console.error('[GET /api/ideas/[id]]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
