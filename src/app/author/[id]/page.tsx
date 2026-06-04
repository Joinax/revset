// src/app/author/[id]/page.tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/Navbar'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const author = await db.user.findUnique({
    where: { id },
    include: {
      authorProfile: true,
      products: {
        where:   { isPublished: true },
        orderBy: { downloads: 'desc' },
        include: { category: { select: { name: true } } },
      },
    },
  })

  if (!author || author.role !== 'author') notFound()

  const totalDownloads = author.products.reduce((s, p) => s + p.downloads, 0)
  const freeCount      = author.products.filter(p => p.price === null).length
  const paidCount      = author.products.filter(p => p.price !== null).length

  const mappedProducts = author.products.map(p => ({
    id:          p.id,
    name:        p.name,
    author:      author.name,
    price:       p.price,
    rating:      4.8,
    reviewCount: 0,
    isNew:       p.isNew,
    emoji:       p.previewEmoji ?? '📦',
    previewBg:   p.previewBg   ?? '#141420',
  }))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>

        {/* Хлебные крошки */}
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
          <Link href="/"       style={{ color: 'var(--muted)' }}>Главная</Link> {' → '}
          <Link href="/catalog" style={{ color: 'var(--muted)' }}>Каталог</Link> {' → '}
          <span style={{ color: 'var(--accent)' }}>{author.name}</span>
        </div>

        {/* Карточка автора */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '28px',
          display: 'flex', gap: '20px', alignItems: 'flex-start',
          marginBottom: '24px', flexWrap: 'wrap',
        }}>
          {/* Аватар */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 700, flexShrink: 0,
            border: '3px solid var(--border)',
          }}>
            {author.name[0].toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            {/* Имя и бейдж */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>{author.name}</h1>
              {author.authorProfile?.isVerified && (
                <span style={{ fontSize: '11px', background: 'rgba(29,158,117,0.15)', color: '#1D9E75', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                  ✓ Верифицирован
                </span>
              )}
            </div>

            {/* Город и bio */}
            {author.authorProfile?.city && (
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
                📍 {author.authorProfile.city}
              </div>
            )}
            {author.authorProfile?.bio && (
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', maxWidth: '500px', marginBottom: '16px' }}>
                {author.authorProfile.bio}
              </p>
            )}

            {/* Метрики */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { value: author.products.length.toString(), label: 'моделей'     },
                { value: totalDownloads.toLocaleString('ru'), label: 'скачиваний' },
                { value: freeCount.toString(),               label: 'бесплатных'  },
                { value: paidCount.toString(),               label: 'платных'     },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопка заказа */}
          {author.authorProfile?.acceptOrders && (
            <div style={{
              background: 'rgba(41,82,200,0.08)', border: '1px solid rgba(41,82,200,0.2)',
              borderRadius: '10px', padding: '16px', textAlign: 'center', minWidth: '180px',
            }}>
              <i className="ti ti-message" style={{ fontSize: '24px', color: 'var(--accent)', display: 'block', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Принимает заказы</div>
              {author.authorProfile.responseTime && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>
                  Ответ {author.authorProfile.responseTime}
                </div>
              )}
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '8px 16px', fontSize: '12px' }}>
                Написать
              </button>
            </div>
          )}
        </div>

        {/* Модели автора */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Модели автора
          </span>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {author.products.length} шт.
          </span>
        </div>

        {mappedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <i className="ti ti-file-3d" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
            У этого автора пока нет опубликованных моделей
          </div>
        ) : (
          <div className="cards-grid">
            {mappedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
