import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminPacksClient from './AdminPacksClient'

export default async function AdminPacksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params   = await searchParams
  const status   = params.status   ?? 'all'
  const category = params.category ?? 'all'
  const q        = params.q        ?? ''
  const page     = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 15

  const VALID_STATUSES = ['PENDING_SCAN', 'PENDING', 'APPROVED', 'REJECTED', 'BUILDING_BUNDLE', 'BUNDLE_FAILED', 'DRAFT']

  const where: Record<string, unknown> = {}
  if (VALID_STATUSES.includes(status)) where.moderationStatus = status
  if (category !== 'all') where.categoryId = category
  if (q) {
    where.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author:      { is: { name: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  const [packs, total, categories] = await Promise.all([
    db.pack.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author:   { select: { id: true, name: true, email: true } },
        category: { select: { name: true } },
        images:   { orderBy: { position: 'asc' }, take: 1 },
        products: { select: { id: true } },
      },
    }),
    db.pack.count({ where }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
  ])

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
      categories={categories.map(c => ({ id: c.id, name: c.name }))}
      total={total}
      currentPage={page}
      perPage={PER_PAGE}
      currentStatus={status}
      currentCategory={category}
      currentQ={q}
    />
  )
}
