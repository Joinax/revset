// src/app/admin/families/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminFamiliesClient from './AdminFamiliesClient'

export default async function AdminFamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params = await searchParams
  const status   = params.status   ?? 'all'
  const category = params.category ?? 'all'
  const q        = params.q        ?? ''
  const page     = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 15

  const where: any = {}
  if (status === 'published')   where.isPublished = true
  if (status === 'unpublished') where.isPublished = false
  if (category !== 'all')       where.categoryId  = category
  if (q) {
    where.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author:      { is: { name: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author:   { select: { name: true } },
        category: { select: { name: true, id: true } },
        _count:   { select: { reviews: true, orderItems: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
  ])

  return (
    <AdminFamiliesClient
      products={products.map(p => ({
        id:          p.id,
        name:        p.name,
        authorName:  p.author.name,
        categoryId:  p.categoryId,
        categoryName: p.category.name,
        price:       p.price,
        isPublished: p.isPublished,
        isNew:       p.isNew,
        downloads:   p.downloads,
        reviewCount: p._count.reviews,
        salesCount:  p._count.orderItems,
        createdAt:   p.createdAt.toISOString(),
        emoji:       p.previewEmoji ?? '📦',
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
