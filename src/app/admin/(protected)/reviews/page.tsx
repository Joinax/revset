// src/app/admin/reviews/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminReviewsClient from './AdminReviewsClient'

export default async function AdminReviewsPage({
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
  const status = params.status ?? 'PENDING'
  const page   = Math.max(1, Number(params.page ?? 1))
  const perPage = 20

  const where: any = {}
  if (status !== 'all') where.moderationStatus = status

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
      include: {
        user:    { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, previewEmoji: true, previewBg: true, images: true } },
      },
    }),
    db.review.count({ where }),
  ])

  const pendingCount = await db.review.count({ where: { moderationStatus: 'PENDING' } })

  return (
    <AdminReviewsClient
      reviews={reviews.map(r => ({
        id:               r.id,
        rating:           r.rating,
        text:             r.text,
        moderationStatus: r.moderationStatus,
        createdAt:        r.createdAt.toISOString(),
        user:    { id: r.user.id, name: r.user.name, email: r.user.email },
        product: { id: r.product.id, name: r.product.name, previewEmoji: r.product.previewEmoji ?? '📦', previewBg: r.product.previewBg ?? '#141420', images: r.product.images ?? [] },
      }))}
      total={total}
      currentPage={page}
      perPage={perPage}
      currentStatus={status}
      pendingCount={pendingCount}
    />
  )
}
