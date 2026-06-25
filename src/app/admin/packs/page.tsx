import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminPacksClient from './AdminPacksClient'

export default async function AdminPacksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { status = 'PENDING' } = await searchParams

  const packs = await db.pack.findMany({
    where:   { moderationStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' },
    include: {
      author:   { select: { id: true, name: true, email: true } },
      category: { select: { name: true } },
      images:   { orderBy: { position: 'asc' }, take: 1 },
      products: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const counts = await db.pack.groupBy({
    by: ['moderationStatus'],
    _count: true,
  })

  const countMap = Object.fromEntries(counts.map(c => [c.moderationStatus, c._count]))

  return (
    <AdminPacksClient
      packs={packs.map(p => ({
        id:               p.id,
        name:             p.name,
        price:            Number(p.price),
        moderationStatus: p.moderationStatus,
        createdAt:        p.createdAt.toISOString(),
        authorName:       p.author.name,
        authorEmail:      p.author.email,
        categoryName:     p.category.name,
        productsCount:    p.products.length,
        coverKey:         p.images[0]?.key ?? null,
      }))}
      pendingCount={countMap['PENDING'] ?? 0}
      currentStatus={status}
    />
  )
}
