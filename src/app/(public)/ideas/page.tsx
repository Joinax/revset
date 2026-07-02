// src/app/(public)/ideas/page.tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import IdeasClient from './IdeasClient'

export default async function IdeasPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)

  const [ideas, total] = await Promise.all([
    db.idea.findMany({
      where:   { moderationStatus: 'APPROVED' },
      orderBy: { voteCount: 'desc' },
      take:    20,
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
        take:   3,
      }),
    ])
    votedIds     = new Set(votes.map(v => v.ideaId))
    pendingIdeas = pending
  }

  return (
    <IdeasClient
      initialIdeas={ideas.map(i => ({
        id:           i.id,
        number:       i.number,
        title:        i.title,
        description:  i.description,
        category:     i.category,
        voteCount:    i.voteCount,
        commentCount: i._count.comments,
        createdAt:    i.createdAt.toISOString(),
        hasVoted:     votedIds.has(i.id),
      }))}
      initialTotal={total}
      pendingIdeas={pendingIdeas}
      isLoggedIn={!!session}
    />
  )
}
