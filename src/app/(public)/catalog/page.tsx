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
  const params  = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })

  const q           = params.q        ?? ''
  const sort        = params.sort     ?? 'popular'
  const page        = Math.max(1, Number(params.page ?? 1))
  const priceFilter = params.price ?? 'all'
  const priceMin    = params.priceMin ? parseFloat(params.priceMin) : undefined
  const priceMax    = params.priceMax ? parseFloat(params.priceMax) : undefined
  const versions    = params.versions ? params.versions.split(',') : []

  const category = params.category
    ? await db.category.findUnique({ where: { slug: params.category } })
    : null

  // --- Фильтры для Product ---
  const productWhere: any = { isPublished: true }
  if (q) {
    productWhere.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author:      { is: { name: { contains: q, mode: 'insensitive' } } } },
    ]
  }
  if (category)                 productWhere.categoryId = category.id
  if (priceFilter === 'free')   productWhere.price = null
  else if (priceFilter === 'paid') productWhere.price = { not: null }
  if (priceMin !== undefined || priceMax !== undefined) {
    productWhere.price = {
      ...productWhere.price,
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    }
  }
  if (versions.length > 0) productWhere.revitVersions = { hasSome: versions }

  // --- Фильтры для Pack (revitVersions не применяется) ---
  const packWhere: any = { moderationStatus: 'APPROVED' }
  if (q) {
    packWhere.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author:      { is: { name: { contains: q, mode: 'insensitive' } } } },
    ]
  }
  if (category) packWhere.categoryId = category.id
  if (priceFilter === 'free')      packWhere.price = 0
  else if (priceFilter === 'paid') packWhere.price = { gt: 0 }
  if (priceMin !== undefined || priceMax !== undefined) {
    packWhere.price = {
      ...packWhere.price,
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    }
  }

  const [products, packs, categories, favorites, cart, purchasedProducts, purchasedPacks] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      include: {
        author:  { select: { name: true } },
        _count:  { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.pack.findMany({
      where: packWhere,
      include: {
        author:   { select: { name: true } },
        images:   { orderBy: { position: 'asc' }, take: 1 },
        reviews:  { select: { rating: true } },
        _count:   { select: { products: true, reviews: true } },
      },
    }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
    session?.user ? db.favorite.findMany({
      where:  { userId: session.user.id },
      select: { productId: true },
    }) : Promise.resolve([]),
    session?.user ? db.cart.findFirst({
      where:  { userId: session.user.id },
      select: { items: { select: { productId: true, packId: true } } },
    }) : Promise.resolve(null),
    session?.user ? db.orderItem.findMany({
      where:  { order: { userId: session.user.id, status: 'PAID' }, productId: { not: null } },
      select: { productId: true },
    }) : Promise.resolve([]),
    session?.user ? db.orderItem.findMany({
      where:  { order: { userId: session.user.id, status: 'PAID' }, packId: { not: null } },
      select: { packId: true },
    }) : Promise.resolve([]),
  ])

  const favoriteIds        = new Set(favorites.map(f => f.productId))
  const cartProductIds     = new Set((cart?.items ?? []).map(i => i.productId).filter(Boolean))
  const cartPackIds        = new Set((cart?.items ?? []).map(i => i.packId).filter(Boolean))
  const purchasedProductIds = new Set(purchasedProducts.map(i => i.productId))
  const purchasedPackIds    = new Set(purchasedPacks.map(i => i.packId))

  // Унифицированный тип для каталога
  type CatalogItem =
    | { kind: 'product'; id: string; name: string; author: string; price: number | null
        rating: number | null; reviewCount: number; isNew: boolean; emoji: string
        previewBg: string; revitVersions: string[]; categorySlug: string
        isFavorited: boolean; isInCart: boolean; isPurchased: boolean; images: string[]
        createdAt: Date; downloads: number }
    | { kind: 'pack'; id: string; name: string; author: string; price: number
        rating: number | null; reviewCount: number; coverImage: string | null
        cardCount: number; isInCart: boolean; isPurchased: boolean
        createdAt: Date }

  const productItems: CatalogItem[] = products.map(p => ({
    kind:          'product' as const,
    id:            p.id,
    name:          p.name,
    author:        p.author.name ?? 'Автор',
    price:         p.price !== null ? Number(p.price) : null,
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
    isInCart:      cartProductIds.has(p.id),
    isPurchased:   purchasedProductIds.has(p.id),
    images:        p.images ?? [],
    createdAt:     p.createdAt,
    downloads:     p.downloads,
  }))

  const packItems: CatalogItem[] = packs.map(p => ({
    kind:        'pack' as const,
    id:          p.id,
    name:        p.name,
    author:      p.author.name ?? 'Автор',
    price:       Number(p.price),
    rating:      p.reviews.length > 0
      ? Math.round(p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length * 10) / 10
      : null,
    reviewCount: p._count.reviews,
    coverImage:  p.images[0]?.key ?? null,
    cardCount:   p._count.products,
    isInCart:    cartPackIds.has(p.id),
    isPurchased: purchasedPackIds.has(p.id),
    createdAt:   p.createdAt,
  }))

  // Смешиваем и сортируем
  const all = [...productItems, ...packItems]

  all.sort((a, b) => {
    if (sort === 'newest')    return b.createdAt.getTime() - a.createdAt.getTime()
    if (sort === 'cheap')     return (a.price ?? 0) - (b.price ?? 0)
    if (sort === 'expensive') return (b.price ?? 0) - (a.price ?? 0)
    // popular: продукты сортируем по downloads, паки — ставим вперед (у них нет counter)
    const da = a.kind === 'product' ? a.downloads : 0
    const db_ = b.kind === 'product' ? b.downloads : 0
    return db_ - da
  })

  const total   = all.length
  const sliced  = all.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const mappedCategories = categories.map(c => ({
    slug:   c.slug,
    name:   c.name,
    emoji:  c.emoji  ?? '📦',
    iconBg: c.iconBg ?? '#1C1C28',
    id:     c.id,
  }))

  return (
    <CatalogClient
      items={sliced}
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
