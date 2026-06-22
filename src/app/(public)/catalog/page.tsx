// src/app/catalog/page.tsx
import { db }      from '@/lib/db'
import { auth }    from '@/lib/auth'
import { headers } from 'next/headers'
import CatalogClient from './CatalogClient'
export { metadata } from './metadata'

type SearchParams = {
  q?:        string
  category?: string
  versions?: string
  price?:    string
  priceMin?: string
  priceMax?: string
  sort?:     string
  page?:     string
}

const PER_PAGE = 12

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })

  const q        = params.q        ?? ''
  const sort     = params.sort     ?? 'popular'
  const page     = Math.max(1, Number(params.page ?? 1))
  const priceFilter = params.price ?? 'all'
  const priceMin = params.priceMin ? parseFloat(params.priceMin) : undefined
  const priceMax = params.priceMax ? parseFloat(params.priceMax) : undefined
  const versions = params.versions ? params.versions.split(',') : []

  const category = params.category
    ? await db.category.findUnique({ where: { slug: params.category } })
    : null

  const where: any = { isPublished: true }
  if (q) {
    where.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author:      { is: { name: { contains: q, mode: 'insensitive' } } } },
    ]
  }
  if (category) where.categoryId = category.id
  if (priceFilter === 'free') where.price = null
  else if (priceFilter === 'paid') where.price = { not: null }
  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {
      ...where.price,
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    }
  }
  if (versions.length > 0) where.revitVersions = { hasSome: versions }

  const orderBy: any =
    sort === 'newest'    ? { createdAt: 'desc' } :
    sort === 'cheap'     ? { price: 'asc'      } :
    sort === 'expensive' ? { price: 'desc'     } :
                           { downloads: 'desc' }

  const [products, total, categories, favorites, cart, purchasedItems] = await Promise.all([
    db.product.findMany({
      where, orderBy,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      include: {
        author:  { select: { name: true } },
        _count:  { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
    session?.user ? db.favorite.findMany({
      where:  { userId: session.user.id },
      select: { productId: true },
    }) : Promise.resolve([]),
    session?.user ? db.cart.findFirst({
      where:  { userId: session.user.id },
      select: { items: { select: { productId: true } } },
    }) : Promise.resolve(null),
    session?.user ? db.orderItem.findMany({
      where:  { order: { userId: session.user.id, status: 'PAID' } },
      select: { productId: true },
    }) : Promise.resolve([]),
  ])

  const favoriteIds  = new Set(favorites.map(f => f.productId))
  const cartIds      = new Set((cart?.items ?? []).map(i => i.productId))
  const purchasedIds = new Set(purchasedItems.map(i => i.productId))

  const mappedProducts = products.map(p => ({
    id:            p.id,
    name:          p.name,
    author:        p.author.name ?? 'Автор',
    price:         p.price,
    rating:        p.reviews.length > 0
      ? Math.round(p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length * 10) / 10
      : null,
    reviewCount:   p._count.reviews,
    isNew:         p.isNew,
    emoji:         p.previewEmoji ?? '📦',
    previewBg:     p.previewBg   ?? '#141420',
    revitVersions: p.revitVersions,
    categorySlug:  p.categoryId,
    isFavorited:   favoriteIds.has(p.id),
    isInCart:      cartIds.has(p.id),
    isPurchased:   purchasedIds.has(p.id),
    images: p.images ?? [],
  }))

  const mappedCategories = categories.map(c => ({
    slug:   c.slug,
    name:   c.name,
    emoji:  c.emoji  ?? '📦',
    iconBg: c.iconBg ?? '#1C1C28',
    id:     c.id,
  }))

  return (
    <CatalogClient
      products={mappedProducts}
      categories={mappedCategories}
      total={total}
      perPage={PER_PAGE}
      currentPage={page}
      currentParams={{
        q, sort, page: page.toString(),
        category: params.category ?? '',
        versions: params.versions ?? '',
        price:    priceFilter,
        priceMin: params.priceMin ?? '',
        priceMax: params.priceMax ?? '',
      }}
    />
  )
}
