// src/app/author-dashboard/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AuthorDashboardClient from './AuthorDashboardClient'

export default async function AuthorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  // Проверяем что пользователь автор
  const user = await db.user.findUnique({
    where:   { id: session.user.id },
    include: { authorProfile: true },
  })

  if (!user) redirect('/login')

  // Если не автор — редирект в обычный кабинет
  if (user.role !== 'author' || !user.authorProfile) redirect('/account')

  // Загружаем товары автора со статистикой
  const products = await db.product.findMany({
    where:   { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      _count:   { select: { reviews: true, orderItems: true } },
    },
  })

  // Считаем общую статистику
  const totalRevenue = await db.orderItem.aggregate({
    where:  { product: { authorId: user.id } },
    _sum:   { price: true },
    _count: { id: true },
  })

  return (
    <AuthorDashboardClient
      user={{
        id:       user.id,
        name:     user.name,
        email:    user.email,
        isVerified: user.authorProfile.isVerified,
        city:     user.authorProfile.city,
        bio:      user.authorProfile.bio,
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
        totalProducts: products.length,
        publishedCount: products.filter(p => p.isPublished).length,
        totalSales:    totalRevenue._count.id,
        totalRevenue:  totalRevenue._sum.price ?? 0,
        totalDownloads: products.reduce((s, p) => s + p.downloads, 0),
      }}
    />
  )
}
