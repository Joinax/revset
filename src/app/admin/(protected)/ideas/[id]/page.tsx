// src/app/admin/ideas/[id]/page.tsx
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminIdeaDetailClient from './AdminIdeaDetailClient'

export default async function AdminIdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!can(user, 'moderate')) redirect('/admin/dashboard')

  const { id } = await params

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      comments: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!idea) notFound()

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <Link
        href="/admin/ideas"
        style={{ fontSize: '13px', color: 'var(--admin-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
      >
        <i className="ti ti-arrow-left" /> Все идеи
      </Link>

      <AdminIdeaDetailClient
        idea={{
          id:                idea.id,
          number:            idea.number,
          title:             idea.title,
          description:       idea.description,
          category:          idea.category,
          status:            idea.status,
          moderationStatus:  idea.moderationStatus,
          moderationComment: idea.moderationComment,
          voteCount:         idea.voteCount,
          createdAt:         idea.createdAt.toISOString(),
          author:            { name: idea.user.name, email: idea.user.email },
        }}
        comments={idea.comments.map(c => ({
          id:        c.id,
          text:      c.text,
          createdAt: c.createdAt.toISOString(),
          moderationStatus: c.moderationStatus,
          author:    { name: c.user.name, email: c.user.email },
        }))}
      />
    </div>
  )
}
