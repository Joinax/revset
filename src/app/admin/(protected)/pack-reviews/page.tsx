import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminPackReviewsClient from './AdminPackReviewsClient'

export default async function AdminPackReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { status: rawStatus = 'PENDING' } = await searchParams

  const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
  type ValidStatus = typeof VALID_STATUSES[number]
  const status: ValidStatus = VALID_STATUSES.includes(rawStatus as ValidStatus)
    ? rawStatus as ValidStatus
    : 'PENDING'

  const reviews = await db.packReview.findMany({
    where: { moderationStatus: status },
    include: {
      user: { select: { name: true, email: true } },
      pack: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const counts = await db.packReview.groupBy({
    by: ['moderationStatus'],
    _count: true,
  })
  const countMap = Object.fromEntries(counts.map(c => [c.moderationStatus, c._count]))

  return (
    <AdminPackReviewsClient
      reviews={reviews.map(r => ({
        id:        r.id,
        rating:    r.rating,
        text:      r.text,
        createdAt: r.createdAt.toISOString(),
        userName:  r.user.name,
        userEmail: r.user.email,
        packId:    r.pack.id,
        packName:  r.pack.name,
      }))}
      currentStatus={status}
      pendingCount={countMap['PENDING'] ?? 0}
    />
  )
}
