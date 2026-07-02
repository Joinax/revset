// src/app/(public)/ideas/[id]/page.tsx
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import IdeaDetailClient from './IdeaDetailClient'

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!idea || idea.moderationStatus !== 'APPROVED') notFound()

  let hasVoted = false
  if (session) {
    const vote = await db.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
    })
    hasVoted = !!vote
  }

  return (
    <IdeaDetailClient
      idea={{
        id:          idea.id,
        number:      idea.number,
        title:       idea.title,
        description: idea.description,
        category:    idea.category,
        voteCount:   idea.voteCount,
        createdAt:   idea.createdAt.toISOString(),
        hasVoted,
      }}
      comments={idea.comments.map(c => ({
        id:        c.id,
        text:      c.text,
        createdAt: c.createdAt.toISOString(),
        author:    { name: c.user.name },
      }))}
      isLoggedIn={!!session}
    />
  )
}
