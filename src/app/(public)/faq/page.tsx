// src/app/(public)/faq/page.tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import FaqClient from './FaqClient'

export const metadata = {
  title: 'Часто задаваемые вопросы — REVSET',
}

export default async function FaqPage() {
  const [session, articles] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    db.faqArticle.findMany({
      where:   { isPublished: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  return (
    <FaqClient
      isLoggedIn={!!session?.user}
      articles={articles.map((a) => ({
        id:         a.id,
        question:   a.question,
        answer:     a.answer,
        category:   a.category,
        helpfulYes: a.helpfulYes,
        helpfulNo:  a.helpfulNo,
      }))}
    />
  )
}
