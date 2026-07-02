// src/app/(public)/faq/page.tsx
import { db } from '@/lib/db'
import FaqClient from './FaqClient'

export const metadata = {
  title: 'Часто задаваемые вопросы — REVSET',
}

export default async function FaqPage() {
  const articles = await db.faqArticle.findMany({
    where:   { isPublished: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <FaqClient
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
