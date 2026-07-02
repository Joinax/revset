// src/app/admin/faq/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminFaqClient from './AdminFaqClient'

export const metadata = {
  title: 'FAQ — Панель управления',
}

export default async function AdminFaqPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!can(user, 'support')) redirect('/admin/dashboard')

  const articles = await db.faqArticle.findMany({
    orderBy: [{ position: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <AdminFaqClient
      initialArticles={articles.map((a) => ({
        id:          a.id,
        question:    a.question,
        answer:      a.answer,
        category:    a.category,
        position:    a.position,
        isPublished: a.isPublished,
        helpfulYes:  a.helpfulYes,
        helpfulNo:   a.helpfulNo,
        createdAt:   a.createdAt.toISOString(),
        updatedAt:   a.updatedAt.toISOString(),
      }))}
    />
  )
}
