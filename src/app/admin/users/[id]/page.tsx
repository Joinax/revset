// src/app/admin/users/[id]/page.tsx
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminUserDetailClient from './AdminUserDetailClient'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    include: {
      authorProfile: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: { include: { product: { select: { name: true } } } } },
      },
      products: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { category: { select: { name: true } } },
      },
      _count: { select: { orders: true, products: true, reviews: true, favorites: true } },
    },
  })

  if (!user) notFound()

  return (
    <AdminUserDetailClient
      user={{
        id:            user.id,
        name:          user.name,
        email:         user.email,
        image:         user.image,
        role:          user.role,
        emailVerified: user.emailVerified,
        createdAt:     user.createdAt.toISOString(),
        updatedAt:     user.updatedAt.toISOString(),
        ordersCount:   user._count.orders,
        productsCount: user._count.products,
        reviewsCount:  user._count.reviews,
        favoritesCount: user._count.favorites,
      }}
      authorProfile={user.authorProfile ? {
        bio:          user.authorProfile.bio,
        city:         user.authorProfile.city,
        isVerified:   user.authorProfile.isVerified,
        autoPublish:  user.authorProfile.autoPublish,
        totalSales:   user.authorProfile.totalSales,
        totalRevenue: user.authorProfile.totalRevenue,
        createdAt:    user.authorProfile.createdAt.toISOString(),
      } : null}
      orders={user.orders.map(o => ({
        id:          o.id,
        status:      o.status,
        totalAmount: o.totalAmount,
        itemNames:   o.items.map(i => i.product.name),
        createdAt:   o.createdAt.toISOString(),
      }))}
      products={user.products.map(p => ({
        id:          p.id,
        name:        p.name,
        price:       p.price,
        isPublished: p.isPublished,
        downloads:   p.downloads,
        category:    p.category.name,
        createdAt:   p.createdAt.toISOString(),
        emoji:       p.previewEmoji ?? '📦',
      }))}
    />
  )
}
