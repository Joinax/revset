// src/app/catalog/page.tsx
import { db } from '@/lib/db'
import CatalogClient from './CatalogClient'
export { metadata } from './metadata'

type SearchParams = {
  q?:        string    // поиск
  category?: string    // slug категории
  versions?: string    // через запятую: 2022,2023
  price?:    string    // free | paid | all
  priceMin?: string
  priceMax?: string
  sort?:     string    // popular | newest | cheap | expensive
  page?:     string
}

const PER_PAGE = 12

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const q        = params.q        ?? ''
  const sort     = params.sort     ?? 'popular'
  const page     = Math.max(1, Number(params.page ?? 1))
  const priceFilter = params.price ?? 'all'
  const priceMin = params.priceMin ? parseFloat(params.priceMin) : undefined
  const priceMax = params.priceMax ? parseFloat(params.priceMax) : undefined
  const versions = params.versions ? params.versions.split(',') : []

  // Находим категорию если выбрана
  const category = params.category
    ? await db.category.findUnique({ where: { slug: params.category } })
    : null

  // Строим фильтр
  const where: any = { isPublished: true }

  // Поиск по названию через PostgreSQL
  if (q) {
    where.name = { contains: q, mode: 'insensitive' }
  }

  // Фильтр по категории
  if (category) {
    where.categoryId = category.id
  }

  // Фильтр по цене
  if (priceFilter === 'free') {
    where.price = null
  } else if (priceFilter === 'paid') {
    where.price = { not: null }
  }

  // Фильтр по диапазону цен
  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {
      ...where.price,
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    }
  }

  // Фильтр по версиям Revit
  if (versions.length > 0) {
    where.revitVersions = { hasSome: versions }
  }

  // Сортировка
  const orderBy: any =
    sort === 'newest'    ? { createdAt: 'desc' } :
    sort === 'cheap'     ? { price: 'asc'      } :
    sort === 'expensive' ? { price: 'desc'     } :
                           { downloads: 'desc' }  // popular

  // Параллельно загружаем товары и общее количество
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
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
  ])

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
