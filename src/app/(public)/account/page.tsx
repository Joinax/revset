// src/app/(public)/account/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AccountClient from './AccountClient'

type ModerationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; apStatus?: string; apPrice?: string; apSort?: string; apQ?: string; salesPage?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const { page: pageParam, apStatus, apPrice, apSort, apQ, salesPage: salesPageParam } = await searchParams
  const salesPage = Math.max(1, parseInt(salesPageParam ?? '1', 10))
  const salesPerPage = 15
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10))
  const perPage = 10

  const status: 'all' | ModerationStatus = apStatus ? (apStatus as ModerationStatus) : 'all'
  const price:  'all' | 'free' | 'paid'   = (apPrice as 'free' | 'paid') || 'all'
  const sort:   'date' | 'sales' | 'downloads' = (apSort as 'sales' | 'downloads') || 'date'
  const query   = apQ || ''

  const [user, orders, favorites, followings, myReviews] = await Promise.all([
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
    db.review.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, previewEmoji: true, previewBg: true, images: true } } },
    }),
  ])



  if (!user) redirect('/login')

  const isAuthor = user.role === 'author' && !!user.authorProfile

  // Отзывы на товары автора — загружаем только если пользователь автор
  let authorReviews: any[] = []
  if (isAuthor) {
    const rawAuthorReviews = await db.review.findMany({
      where:   { product: { authorId: user.id }, moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: {
        user:    { select: { name: true } },
        product: { select: { id: true, name: true, previewEmoji: true, previewBg: true, images: true } },
        comments: {
          where:   { authorId: user.id },
          select:  { id: true, text: true, moderationStatus: true, moderationComment: true },
          take: 1,
        },
        likes: { select: { authorId: true } },
      },
    })
    authorReviews = rawAuthorReviews.map(r => ({
      id:               r.id,
      rating:           r.rating,
      text:             r.text,
      moderationStatus: r.moderationStatus,
      createdAt:        r.createdAt.toISOString(),
      reviewer:  { name: r.user.name },
      product: {
        id:           r.product.id,
        name:         r.product.name,
        previewEmoji: r.product.previewEmoji ?? '📦',
        previewBg:    r.product.previewBg    ?? '#141420',
        images:       r.product.images       ?? [],
      },
      myComment: r.comments[0] ? { ...r.comments[0] } : null,
      isLikedByAuthor: r.likes.some((l: any) => l.authorId === user.id),
      likesCount: r.likes.length,
    }))
  }

  // Профиль создан (форма "Стать автором" отправлена), но роль ещё не подтверждена админом
  const hasPendingAuthorApplication = !!user.authorProfile && user.role !== 'author'

  let authorProducts: any[] = []
  let authorProductsTotal = 0
  let authorStats: any = null
  let allAuthorProductsForTop: any[] = []  // для блока "Топ моделей" в статистике — без пагинации
  let authorSales: any[] = []
  let authorSalesTotal = 0

  if (isAuthor) {
    const where: any = { authorId: user.id }
    if (status !== 'all') where.moderationStatus = status
    if (price === 'free')  where.price = null
    if (price === 'paid')  where.price = { not: null }
    if (query) where.name = { contains: query, mode: 'insensitive' }

    const [productsRaw, agg, published, rejectedCount, salesData, salesByProduct] = await Promise.all([
      // Сортировка по дате — можно сделать прямо в БД; по продажам/скачиваниям — после подгрузки всех подходящих товаров
      sort === 'downloads'
        ? db.product.findMany({ where, orderBy: { downloads: 'desc' } })
        : db.product.findMany({ where, orderBy: { createdAt: 'desc' } }),
      db.product.aggregate({
        where: { authorId: user.id },
        _count: { id: true },
        _sum:   { downloads: true },
      }),
      db.product.count({ where: { authorId: user.id, isPublished: true } }),
      db.product.count({ where: { authorId: user.id, moderationStatus: 'REJECTED' } }),
      db.orderItem.aggregate({
        where:  { product: { authorId: user.id }, order: { status: 'PAID' } },
        _count: { id: true },
        _sum:   { price: true },
      }),
      db.orderItem.groupBy({
        by:     ['productId'],
        where:  { product: { authorId: user.id }, order: { status: 'PAID' } },
        _count: { id: true },
      }),
    ])

    const salesCountMap = new Map(salesByProduct.map(s => [s.productId, s._count.id]))

    let productsWithSales = productsRaw.map(p => ({ ...p, salesCount: salesCountMap.get(p.id) ?? 0 }))

    if (sort === 'sales') {
      productsWithSales = [...productsWithSales].sort((a, b) => b.salesCount - a.salesCount)
    }

    authorProductsTotal = productsWithSales.length
    allAuthorProductsForTop = productsWithSales  // полный список (после фильтров, без пагинации) — для топов в статистике
    authorProducts = productsWithSales.slice((page - 1) * perPage, page * perPage)

    authorStats = {
      totalProducts:  agg._count.id,
      publishedCount: published,
      rejectedCount,
      totalDownloads: agg._sum.downloads ?? 0,
      totalSales:     salesData._count.id,
      totalRevenue:   salesData._sum.price ? Number(salesData._sum.price) : 0,
    }

    // Полный список продаж — все OrderItem по товарам этого автора, где заказ оплачен
    const [salesRaw, salesTotal] = await Promise.all([
      db.orderItem.findMany({
        where:   { product: { authorId: user.id }, order: { status: 'PAID' } },
        orderBy: { order: { createdAt: 'desc' } },
        skip:    (salesPage - 1) * salesPerPage,
        take:    salesPerPage,
        include: {
          product: { select: { id: true, name: true, previewEmoji: true, previewBg: true, images: true } },
          order:   { select: { createdAt: true, status: true, user: { select: { name: true } } } },
        },
      }),
      db.orderItem.count({
        where: { product: { authorId: user.id }, order: { status: 'PAID' } },
      }),
    ])

    authorSales = salesRaw.map(s => ({
      id:          s.id,
      price:       Number(s.price),
      createdAt:   s.order.createdAt.toISOString(),
      orderStatus: s.order.status,
      buyerName:   s.order.user.name ?? 'Без имени',
      product: {
        id:           s.product.id,
        name:         s.product.name,
        previewEmoji: s.product.previewEmoji ?? '📦',
        previewBg:    s.product.previewBg    ?? '#141420',
        images:       s.product.images       ?? [],
      },
    }))
    authorSalesTotal = salesTotal
  }

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
      hasPendingAuthorApplication={hasPendingAuthorApplication}
      authorReviews={authorReviews}
      myReviews={myReviews.map(r => ({
        id:                r.id,
        rating:            r.rating,
        text:              r.text,
        moderationStatus:  r.moderationStatus,
        moderationComment: r.moderationComment ?? null,
        createdAt:         r.createdAt.toISOString(),
        product: {
          id:           r.product.id,
          name:         r.product.name,
          previewEmoji: r.product.previewEmoji ?? '📦',
          previewBg:    r.product.previewBg    ?? '#141420',
          images:       r.product.images       ?? [],
        },
      }))}
      orders={orders.map(o => ({
        id:          o.id,
        status:      o.status,
        totalAmount: Number(o.totalAmount),
        createdAt:   o.createdAt.toISOString(),
        items:       o.items.map(i => ({
          id:    i.id,
          price: Number(i.price),
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
          price:        f.product.price !== null ? Number(f.product.price) : null,
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
        id:               p.id,
        name:             p.name,
        price:            p.price !== null ? Number(p.price) : null,
        isPublished:      p.isPublished,
        moderationStatus: p.moderationStatus,
        moderationComment: p.moderationComment ?? null,
        isNew:            p.isNew,
        downloads:        p.downloads,
        previewEmoji:     p.previewEmoji ?? '📦',
        previewBg:        p.previewBg    ?? '#141420',
        images:           p.images       ?? [],
        category:         p.category,
        createdAt:        p.createdAt.toISOString(),
        reviewCount:      0,
        salesCount:       p.salesCount,
      })) : []}
      authorTopProducts={isAuthor ? {
        bySales: [...allAuthorProductsForTop].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5).map(p => ({
          id: p.id, name: p.name, previewEmoji: p.previewEmoji ?? '📦', previewBg: p.previewBg ?? '#141420', value: p.salesCount, images: p.images ?? [],
        })),
        byDownloads: [...allAuthorProductsForTop].sort((a, b) => b.downloads - a.downloads).slice(0, 5).map(p => ({
          id: p.id, name: p.name, previewEmoji: p.previewEmoji ?? '📦', previewBg: p.previewBg ?? '#141420', value: p.downloads, images: p.images ?? [],
        })),
      } : undefined}
      authorStats={authorStats ?? undefined}
      authorFilters={{ status, price, sort, query }}
      authorPagination={isAuthor ? {
        currentPage: page,
        totalPages:  Math.ceil(authorProductsTotal / perPage),
        perPage,
      } : undefined}
      authorSales={authorSales}
      authorSalesPagination={isAuthor ? {
        currentPage: salesPage,
        totalPages:  Math.ceil(authorSalesTotal / salesPerPage),
        perPage:     salesPerPage,
      } : undefined}
    />
  )
}
