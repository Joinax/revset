// src/app/page.tsx
// Главная страница — данные из БД

import Navbar       from '@/components/Navbar'
import Hero         from '@/components/Hero'
import StatsStrip   from '@/components/StatsStrip'
import CategoryGrid from '@/components/CategoryGrid'
import ProductGrid  from '@/components/ProductCard'
import CTABlock     from '@/components/CTABlock'
import { db }       from '@/lib/db'

// Next.js Server Component — fetch прямо в компоненте, без useEffect
export default async function HomePage() {

  // Загружаем категории и товары параллельно
  const [categories, products, stats] = await Promise.all([

    db.category.findMany({
      orderBy: { order: 'asc' },
    }),

    db.product.findMany({
      where:   { isPublished: true },
      orderBy: { downloads: 'desc' },
      take:    6,
      include: { author: { select: { name: true } } },
    }),

    // Статистика для StatsStrip
    /*Promise.all([
      db.product.count({ where: { isPublished: true } }),
      db.user.count({ where: { role: 'AUTHOR' } }),
    ]),*/
  ])

  //const [productCount, authorCount] = stats

  // Приводим данные из БД к типу Product который ожидает ProductCard
  const mappedProducts = products.map(p => ({
    id:          p.id,
    name:        p.name,
    author:      p.author.name ?? 'Автор',
    price:       p.price,
    rating:      4.8,          // TODO: считать из отзывов когда появятся
    reviewCount: 0,            // TODO: считать из Review
    isNew:       p.isNew,
    emoji:       p.previewEmoji ?? '📦',
    previewBg:   p.previewBg   ?? '#141420',
  }))

  // Приводим категории к типу Category
  const mappedCategories = categories.map(c => ({
    slug:    c.slug,
    name:    c.name,
    count:   'моделей',        // TODO: считать через _count
    emoji:   c.emoji   ?? '📦',
    iconBg:  c.iconBg  ?? '#1C1C28',
  }))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <main>
        <Hero />
        
        {/* <StatsStrip
          productCount={productCount}
          authorCount={authorCount}
        /> */}

        <CategoryGrid items={mappedCategories} />

        <ProductGrid products={mappedProducts} />

        <CTABlock />
      </main>

      <div style={{ height: '64px' }} className="bottom-spacer" />

      <style>{`
        @media (min-width: 641px) { .bottom-spacer { display: none; } }
      `}</style>
    </div>
  )
}
