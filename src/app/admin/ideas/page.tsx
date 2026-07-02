// src/app/admin/ideas/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminIdeasClient from './AdminIdeasClient'

export default async function AdminIdeasPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) redirect('/admin/dashboard')

  const ideas = await db.idea.findMany({
    where:   { moderationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user:   { select: { name: true, email: true } },
      _count: { select: { comments: true, votes: true } },
    },
  })

  return (
    <AdminIdeasClient
      initialIdeas={ideas.map(i => ({
        id:           i.id,
        number:       i.number,
        title:        i.title,
        description:  i.description,
        category:     i.category,
        moderationStatus: i.moderationStatus,
        moderationComment: i.moderationComment,
        status:       i.status,
        voteCount:    i.voteCount,
        commentCount: i._count.comments,
        createdAt:    i.createdAt.toISOString(),
        author:       { name: i.user.name, email: i.user.email },
        userId:       i.userId,
      }))}
    />
  )
}
