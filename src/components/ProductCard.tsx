'use client'

import Link from 'next/link'

export type Product = {
  id: string
  name: string
  author: string
  price: number | null
  rating: number
  reviewCount: number
  isNew?: boolean
  emoji: string
  previewBg: string
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Кресло Herman Miller Aeron',
    author: 'arch_studio',
    price: 490,
    rating: 4.9,
    reviewCount: 38,
    isNew: true,
    emoji: '🪑',
    previewBg: '#141420',
  },
  {
    id: '2',
    name: 'Ванна Villeroy & Boch Oberon',
    author: 'bim_master',
    price: 350,
    rating: 4.7,
    reviewCount: 22,
    emoji: '🛁',
    previewBg: '#14201A',
  },
  {
    id: '3',
    name: 'Светильник Eglo Salobrena',
    author: 'light_bim',
    price: null,
    rating: 4.8,
    reviewCount: 56,
    emoji: '💡',
    previewBg: '#201414',
  },
]

type CardProps = {
  product: Product
}

export function ProductCard({ product }: CardProps) {
  const { id, name, author, price, rating, reviewCount, isNew, emoji, previewBg } = product

  return (
    <Link href={`/product/${id}`} style={{ textDecoration: 'none', display: 'block' }} className="card">
      <div style={{
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        background: previewBg,
        borderBottom: '1px solid var(--border)',
        position: 'relative',
      }}>
        {isNew && (
          <span style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'var(--accent)', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            padding: '2px 8px', borderRadius: '4px',
          }}>
            Новинка
          </span>
        )}
        <button
          aria-label="Добавить в избранное"
          onClick={e => e.preventDefault()}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: 0, lineHeight: 1,
          }}
        >
          <i className="ti ti-heart" style={{ fontSize: '16px' }} />
        </button>
        {emoji}
      </div>

      <div style={{ padding: '12px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600, marginBottom: '4px',
          color: 'var(--text)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
          {author}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {price !== null ? (
            <span className="price">{price} ₽</span>
          ) : (
            <span className="badge-free">Бесплатно</span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            ★ {rating} ({reviewCount})
          </span>
        </div>
      </div>
    </Link>
  )
}

type GridProps = {
  title?: string
  products?: Product[]
  showSeeAll?: boolean
}

export default function ProductGrid({
  title = 'Популярное',
  products = mockProducts,
  showSeeAll = true,
}: GridProps) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 24px 16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em',
        }}>
          {title}
        </span>
        {showSeeAll && (
          <Link href="/catalog" style={{ fontSize: '12px', color: 'var(--muted)' }} className="see-all-link">
            Смотреть все →
          </Link>
        )}
      </div>
      <div className="cards-grid" style={{ padding: '0 24px 24px' }}>
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <style>{`.see-all-link:hover { color: var(--accent) !important; }`}</style>
    </section>
  )
}
