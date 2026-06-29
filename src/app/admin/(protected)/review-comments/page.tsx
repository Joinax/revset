// src/app/admin/review-comments/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminReviewCommentsClient from './AdminReviewCommentsClient'

export default async function AdminReviewCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') redirect('/')

  const params = await searchParams
  const status  = params.status ?? 'PENDING'
  const page    = Math.max(1, Number(params.page ?? 1))
  const perPage = 20

  const where: any = {}
  if (status !== 'all') where.moderationStatus = status

  const [comments, total, pendingCount] = await Promise.all([
    db.reviewComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
      include: {
        author: { select: { id: true, name: true, email: true } },
        review: {
          include: {
            product: { select: { id: true, name: true, previewEmoji: true, previewBg: true, images: true } },
            user:    { select: { name: true } },
          },
        },
      },
    }),
    db.reviewComment.count({ where }),
    db.reviewComment.count({ where: { moderationStatus: 'PENDING' } }),
  ])

  return (
    <AdminReviewCommentsClient
      comments={comments.map(c => ({
        id:               c.id,
        text:             c.text,
        moderationStatus: c.moderationStatus,
        createdAt:        c.createdAt.toISOString(),
        author:  { id: c.author.id, name: c.author.name, email: c.author.email },
        review: {
          id:         c.review.id,
          rating:     c.review.rating,
          text:       c.review.text,
          reviewerName: c.review.user.name,
          product: {
            id:           c.review.product.id,
            name:         c.review.product.name,
            previewEmoji: c.review.product.previewEmoji ?? '📦',
            previewBg:    c.review.product.previewBg    ?? '#141420',
            images:       c.review.product.images       ?? [],
          },
        },
      }))}
      total={total}
      currentPage={page}
      perPage={perPage}
      currentStatus={status}
      pendingCount={pendingCount}
    />
  )
}
