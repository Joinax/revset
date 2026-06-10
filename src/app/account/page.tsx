// src/app/account/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AccountClient from './AccountClient'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10))
  const perPage = 10

  const [user, orders, favorites, followings] = await Promise.all([
    db.user.findUnique({
      where:   { id: session.user.id },
      include: { authorProfile: true },
    }),
    db.order.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    }),
    db.favorite.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    }),
    db.follow.findMany({
      where:   { followerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id:   true,
            name: true,
            authorProfile: { select: { bio: true, isVerified: true } },
            _count: { select: { products: { where: { isPublished: true } } } },
          },
        },
      },
    }),
  ])

  if (!user) redirect('/login')

  const isAuthor = !!user.authorProfile

  const [authorProducts, authorProductsTotal, authorStats] = isAuthor
    ? await Promise.all([
        db.product.findMany({
          where:   { authorId: user.id },
          orderBy: { createdAt: 'desc' },
          skip:    (page - 1) * perPage,
          take:    perPage,
        }),
        db.product.count({ where: { authorId: user.id } }),
        db.product.aggregate({
          where: { authorId: user.id },
          _count: { id: true },
          _sum:   { downloads: true },
        }).then(async agg => {
          const published = await db.product.count({
            where: { authorId: user.id, isPublished: true },
          })
          const salesData = await db.orderItem.aggregate({
            where:  { product: { authorId: user.id }, order: { status: 'PAID' } },
            _count: { id: true },
            _sum:   { price: true },
          })
          return {
            totalProducts:  agg._count.id,
            publishedCount: published,
            totalDownloads: agg._sum.downloads ?? 0,
            totalSales:     salesData._count.id,
            totalRevenue:   salesData._sum.price ?? 0,
          }
        }),
      ])
    : [[], 0, null]

  return (
    <AccountClient
      user={{
        id:         user.id,
        name:       user.name,
        email:      user.email,
        image:      user.image,
        role:       user.role,
        createdAt:  user.createdAt.toISOString(),
        isAuthor,
        isVerified: user.authorProfile?.isVerified ?? false,
        city:       user.authorProfile?.city       ?? null,
        bio:        user.authorProfile?.bio        ?? null,
      }}
      orders={orders.map(o => ({
        id:          o.id,
        status:      o.status,
        totalAmount: o.totalAmount,
        createdAt:   o.createdAt.toISOString(),
        items:       o.items.map(i => ({
          id:    i.id,
          price: i.price,
          product: {
            id:           i.product.id,
            name:         i.product.name,
            previewEmoji: i.product.previewEmoji ?? '📦',
            previewBg:    i.product.previewBg    ?? '#141420',
            images:       i.product.images       ?? [],
          },
        })),
      }))}
      favorites={favorites.map(f => ({
        id: f.id,
        product: {
          id:           f.product.id,
          name:         f.product.name,
          price:        f.product.price,
          previewEmoji: f.product.previewEmoji ?? '📦',
          previewBg:    f.product.previewBg    ?? '#141420',
          images:       f.product.images       ?? [],
        },
      }))}
      followings={followings.map(f => ({
        id:        f.id,
        createdAt: f.createdAt.toISOString(),
        following: {
          id:   f.following.id,
          name: f.following.name,
          authorProfile: f.following.authorProfile,
          _count: { products: f.following._count.products },
        },
      }))}
      authorProducts={isAuthor ? authorProducts.map(p => ({
        id:           p.id,
        name:         p.name,
        price:        p.price,
        isPublished:  p.isPublished,
        isNew:        p.isNew,
        downloads:    p.downloads,
        previewEmoji: p.previewEmoji ?? '📦',
        previewBg:    p.previewBg    ?? '#141420',
        category:     p.category,
        createdAt:    p.createdAt.toISOString(),
        reviewCount:  0,
        salesCount:   0,
      })) : []}
      authorStats={authorStats ?? undefined}
      authorPagination={isAuthor ? {
        currentPage: page,
        totalPages:  Math.ceil(authorProductsTotal / perPage),
        perPage,
      } : undefined}
    />
  )
}
