// src/app/admin/ideas/comments/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminIdeaCommentsClient from './AdminIdeaCommentsClient'

export default async function AdminIdeaCommentsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isModerator: true, isSupport: true },
  })
  if (!can(user, 'moderate')) redirect('/admin/dashboard')

  const comments = await db.ideaComment.findMany({
    where:   { moderationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true } },
      idea: { select: { id: true, title: true, number: true } },
    },
  })

  return (
    <AdminIdeaCommentsClient
      initialComments={comments.map(c => ({
        id:        c.id,
        text:      c.text,
        createdAt: c.createdAt.toISOString(),
        author:    { name: c.user.name },
        idea:      { id: c.idea.id, title: c.idea.title, number: c.idea.number },
      }))}
    />
  )
}
