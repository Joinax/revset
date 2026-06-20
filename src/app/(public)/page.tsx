// src/app/page.tsx
import Hero             from '@/components/Hero'
import CategoryGrid     from '@/components/CategoryGrid'
import { ProductCard }  from '@/components/ProductCard'
import CTABlock         from '@/components/CTABlock'
import { db }           from '@/lib/db'
import { auth }         from '@/lib/auth'
import { headers }      from 'next/headers'
import Link             from 'next/link'

function pluralizeModels(n: number) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} модель`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} модели`
  return `${n} моделей`
}

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const [categories, products, , , favorites, categoryCounts] = await Promise.all([
    db.category.findMany({ orderBy: { order: 'asc' } }),
    db.product.findMany({
      where:   { isPublished: true },
      orderBy: { downloads: 'desc' },
      take:    8,
      include: {
        author:  { select: { name: true } },
        _count:  { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.product.count({ where: { isPublished: true } }),
    db.user.count({ where: { role: 'author' } }),
    session?.user ? db.favorite.findMany({
      where:  { userId: session.user.id },
      select: { productId: true },
    }) : Promise.resolve([]),
    db.product.groupBy({
      by:     ['categoryId'],
      where:  { isPublished: true },
      _count: { id: true },
    }),
  ])

  const categoryCountMap = new Map(categoryCounts.map(c => [c.categoryId, c._count.id]))

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
    images:      p.images ?? [],
  }))

  const mappedCategories = categories.map(c => ({
    slug:   c.slug,
    name:   c.name,
    count:  categoryCountMap.has(c.id) ? pluralizeModels(categoryCountMap.get(c.id)!) : '',
    emoji:  c.emoji  ?? '📦',
    iconBg: c.iconBg ?? '#1C1C28',
  }))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero — на всю ширину страницы, без контейнера */}
      <Hero />

      {/* Отступ под поиск */}
      {/* Весь контент ниже — в том же контейнере что и navbar */}
      <div className="page-content">
        <CategoryGrid items={mappedCategories} />

        <section style={{ padding: '40px 0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Трендовые модели</h2>
            <Link href="/catalog" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
              Смотреть все →
            </Link>
          </div>
          <div className="home-products-grid">
            {mappedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <CTABlock />
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`
        /* Контейнер контента — точно как navbar */
        .page-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px 40px;
        }
        .home-products-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        @media (max-width: 1200px) { .home-products-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 900px)  { .home-products-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  {
          .home-products-grid { grid-template-columns: repeat(2, 1fr); }
          .page-content { padding: 0 16px; }
        }
        @media (max-width: 480px)  { .home-products-grid { grid-template-columns: 1fr; } }
        @media (min-width: 641px)  { .bottom-spacer { display: none; } }
      `}</style>
    </div>
  )
}
