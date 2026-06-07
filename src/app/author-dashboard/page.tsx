// src/app/author-dashboard/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AuthorDashboardClient from './AuthorDashboardClient'

const PER_PAGE = 10

export default async function AuthorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where:   { id: session.user.id },
    include: { authorProfile: true },
  })

  if (!user) redirect('/login')
  if (user.role !== 'author' || !user.authorProfile) redirect('/account')

  const params = await searchParams
  const page   = Math.max(1, Number(params.page ?? 1))

  // Загружаем товары с пагинацией
  const [products, totalProducts, totalRevenue] = await Promise.all([
    db.product.findMany({
      where:   { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      include: {
        category: { select: { name: true } },
        _count:   { select: { reviews: true, orderItems: true } },
      },
    }),
    db.product.count({ where: { authorId: user.id } }),
    db.orderItem.aggregate({
      where:  { product: { authorId: user.id } },
      _sum:   { price: true },
      _count: { id: true },
    }),
  ])

  // Для статистики нужны все товары (не только текущая страница)
  const allDownloads = await db.product.aggregate({
    where: { authorId: user.id },
    _sum:  { downloads: true },
  })

  const publishedCount = await db.product.count({
    where: { authorId: user.id, isPublished: true },
  })

  return (
    <AuthorDashboardClient
      user={{
        id:         user.id,
        name:       user.name,
        email:      user.email,
        isVerified: user.authorProfile.isVerified,
        city:       user.authorProfile.city,
        bio:        user.authorProfile.bio,
      }}
      products={products.map(p => ({
        id:           p.id,
        name:         p.name,
        price:        p.price,
        isPublished:  p.isPublished,
        isNew:        p.isNew,
        downloads:    p.downloads,
        previewEmoji: p.previewEmoji ?? '📦',
        previewBg:    p.previewBg   ?? '#141420',
        category:     p.category.name,
        createdAt:    p.createdAt.toISOString(),
        reviewCount:  p._count.reviews,
        salesCount:   p._count.orderItems,
      }))}
      stats={{
        totalProducts:  totalProducts,
        publishedCount: publishedCount,
        totalSales:     totalRevenue._count.id,
        totalRevenue:   totalRevenue._sum.price ?? 0,
        totalDownloads: allDownloads._sum.downloads ?? 0,
      }}
      pagination={{
        currentPage: page,
        totalPages:  Math.ceil(totalProducts / PER_PAGE),
        perPage:     PER_PAGE,
      }}
    />
  )
}
