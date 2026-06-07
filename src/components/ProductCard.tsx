'use client'

import Link from 'next/link'
import { useState } from 'react'

export type Product = {
  id:          string
  name:        string
  author:      string
  price:       number | null
  rating:      number | null
  reviewCount: number
  isNew?:      boolean
  emoji:       string
  previewBg:   string
  isFavorited?: boolean  // ← новое поле
}

// Кнопка избранного с локальным стейтом
function FavoriteButton({ productId, isFavorited = false }: { productId: string; isFavorited?: boolean }) {
  const [faved, setFaved] = useState(isFavorited)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const method = faved ? 'DELETE' : 'POST'
    const res = await fetch('/api/favorites', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ productId }),
    })
    if (res.ok) setFaved(f => !f)
  }

  return (
    <button
      aria-label={faved ? 'Убрать из избранного' : 'Добавить в избранное'}
      onClick={handleClick}
      style={{
        position: 'absolute', top: '8px', right: '8px',
        background: faved ? 'rgba(41,82,200,0.15)' : 'none',
        border: 'none', cursor: 'pointer',
        color: faved ? 'var(--accent)' : 'var(--muted)',
        padding: '4px', borderRadius: '6px',
        lineHeight: 1, transition: 'color 0.2s, background 0.2s',
      }}
    >
      <i className={`ti ${faved ? 'ti-heart-filled' : 'ti-heart'}`} style={{ fontSize: '16px' }} />
    </button>
  )
}

type CardProps = {
  product: Product
}

export function ProductCard({ product }: CardProps) {
  const { id, name, author, price, rating, reviewCount, isNew, emoji, previewBg, isFavorited } = product

  return (
    <Link href={`/product/${id}`} style={{ textDecoration: 'none', display: 'block' }} className="card">
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', background: previewBg, borderBottom: '1px solid var(--border)', position: 'relative' }}>
        {isNew && (
          <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            Новинка
          </span>
        )}
        <FavoriteButton productId={id} isFavorited={isFavorited} />
        {emoji}
      </div>

      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>{author}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {price !== null ? (
            <span className="price">{price} ₽</span>
          ) : (
            <span className="badge-free">Бесплатно</span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {rating ? `★ ${rating} (${reviewCount})` : `★ (${reviewCount})`}
          </span>
        </div>
      </div>
    </Link>
  )
}

type GridProps = {
  title?:    string
  products?: Product[]
  showSeeAll?: boolean
}

export default function ProductGrid({
  title = 'Популярное',
  products = [],
  showSeeAll = true,
}: GridProps) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 24px 16px' }}>
        <span style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em' }}>
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
