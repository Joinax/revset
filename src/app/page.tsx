// src/app/page.tsx
import Navbar       from '@/components/Navbar'
import Hero         from '@/components/Hero'
import StatsStrip   from '@/components/StatsStrip'
import CategoryGrid from '@/components/CategoryGrid'
import ProductGrid  from '@/components/ProductCard'
import CTABlock     from '@/components/CTABlock'
import { db }       from '@/lib/db'
import { auth }     from '@/lib/auth'
import { headers }  from 'next/headers'

export default async function HomePage() {

  const session = await auth.api.getSession({ headers: await headers() })

  const [categories, products, , , favorites] = await Promise.all([
    db.category.findMany({ orderBy: { order: 'asc' } }),
    db.product.findMany({
      where:   { isPublished: true },
      orderBy: { downloads: 'desc' },
      take:    6,
      include: {
        author:  { select: { name: true } },
        _count:  { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.product.count({ where: { isPublished: true } }),
    db.user.count({ where: { role: 'author' } }),
    // Загружаем избранное только если залогинен
    session?.user ? db.favorite.findMany({
      where:  { userId: session.user.id },
      select: { productId: true },
    }) : Promise.resolve([]),
  ])

  const favoriteIds = new Set(favorites.map(f => f.productId))

  const mappedProducts = products.map(p => ({
    id:          p.id,
    name:        p.name,
    author:      p.author.name ?? 'Автор',
    price:       p.price,
    rating:      p.reviews.length > 0
      ? Math.round(p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length * 10) / 10
      : null,
    reviewCount: p._count.reviews,
    isNew:       p.isNew,
    emoji:       p.previewEmoji ?? '📦',
    previewBg:   p.previewBg   ?? '#141420',
    isFavorited: favoriteIds.has(p.id),
    images: p.images ?? [],
  }))

  const mappedCategories = categories.map(c => ({
    slug:   c.slug,
    name:   c.name,
    count:  'моделей',
    emoji:  c.emoji  ?? '📦',
    iconBg: c.iconBg ?? '#1C1C28',
  }))

return (
  <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
    <Navbar />
    <main style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <Hero />
      {/* <StatsStrip productCount={productCount} authorCount={authorCount} /> */}
      <CategoryGrid items={mappedCategories} />
      <ProductGrid products={mappedProducts} />
      <CTABlock />
    </main>
    <div style={{ height: '64px' }} className="bottom-spacer" />
    <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
  </div>
)
}
