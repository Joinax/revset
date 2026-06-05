// src/app/catalog/page.tsx
import { db } from '@/lib/db'
import CatalogClient from './CatalogClient'
export { metadata } from './metadata'

// Загружаем данные на сервере, передаём клиентскому компоненту
export default async function CatalogPage() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where:   { isPublished: true },
      orderBy: { downloads: 'desc' },
      include: { author: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
  ])

  const mappedProducts = products.map(p => ({
    id:          p.id,
    name:        p.name,
    author:      p.author.name ?? 'Автор',
    price:       p.price,
    rating:      4.8,
    reviewCount: 0,
    isNew:       p.isNew,
    emoji:       p.previewEmoji ?? '📦',
    previewBg:   p.previewBg   ?? '#141420',
    revitVersions: p.revitVersions,
    categorySlug:  p.categoryId,
  }))

  const mappedCategories = categories.map(c => ({
    slug:   c.slug,
    name:   c.name,
    count:  'моделей',
    emoji:  c.emoji  ?? '📦',
    iconBg: c.iconBg ?? '#1C1C28',
    id:     c.id,
  }))

  return <CatalogClient products={mappedProducts} categories={mappedCategories} />
}
