// src/app/api/ideas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const createSchema = z.object({
  title:       z.string().min(5).max(120),
  description: z.string().min(10).max(4000),
  category:    z.string().max(50).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sort    = searchParams.get('sort') === 'new' ? 'new' : 'popular'
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('perPage') ?? '20', 10)))
    const skip    = (page - 1) * perPage

    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)

    const [ideas, total] = await Promise.all([
      db.idea.findMany({
        where:   { moderationStatus: 'APPROVED' },
        orderBy: sort === 'new' ? { createdAt: 'desc' } : { voteCount: 'desc' },
        skip,
        take:    perPage,
        include: { _count: { select: { comments: { where: { moderationStatus: 'APPROVED' } } } } },
      }),
      db.idea.count({ where: { moderationStatus: 'APPROVED' } }),
    ])

    let votedIds = new Set<string>()
    let pendingIdeas: { id: string; number: number; title: string }[] = []

    if (session) {
      const [votes, pending] = await Promise.all([
        db.ideaVote.findMany({
          where:  { userId: session.user.id, ideaId: { in: ideas.map(i => i.id) } },
          select: { ideaId: true },
        }),
        db.idea.findMany({
          where:  { userId: session.user.id, moderationStatus: 'PENDING' },
          select: { id: true, number: true, title: true },
          orderBy: { createdAt: 'desc' },
          take:   5,
        }),
      ])
      votedIds   = new Set(votes.map(v => v.ideaId))
      pendingIdeas = pending
    }

    return NextResponse.json({
      ideas: ideas.map(i => ({
        id:           i.id,
        number:       i.number,
        title:        i.title,
        description:  i.description,
        category:     i.category,
        voteCount:    i.voteCount,
        commentCount: i._count.comments,
        createdAt:    i.createdAt.toISOString(),
        hasVoted:     votedIds.has(i.id),
      })),
      total,
      pendingIdeas,
    })
  } catch (err) {
    console.error('[GET /api/ideas]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }
    const { title, description, category } = parsed.data

    // Rate limit: 5 ideas per 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await db.idea.count({
      where: { userId: session.user.id, createdAt: { gte: since } },
    })
    if (recentCount >= 5) {
      return NextResponse.json({ error: 'Лимит: максимум 5 идей в сутки' }, { status: 429 })
    }

    const idea = await db.idea.create({
      data: {
        userId:           session.user.id,
        title,
        description,
        category:         category ?? null,
        moderationStatus: 'PENDING',
        status:           'UNDER_REVIEW',
      },
      select: { id: true, number: true },
    })

    // Notify moderators and admins
    const moderators = await db.user.findMany({
      where:  { OR: [{ isModerator: true }, { role: 'admin' }], isBanned: false },
      select: { id: true },
    })
    if (moderators.length > 0) {
      await db.notification.createMany({
        data: moderators.map(m => ({
          userId:  m.id,
          type:    'new_idea',
          title:   'Новая идея на модерации',
          message: `Идея «${title}»`,
          link:    '/admin/ideas',
        })),
      })
    }

    return NextResponse.json({ id: idea.id, number: idea.number }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/ideas]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
