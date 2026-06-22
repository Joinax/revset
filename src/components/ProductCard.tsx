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
  isFavorited?: boolean
  isInCart?:    boolean
  isPurchased?: boolean
  images?:      string[]
}

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

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
        position: 'absolute', top: '10px', right: '10px',
        background: faved ? 'rgba(72,128,255,0.9)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: 'none', cursor: 'pointer',
        color: faved ? '#fff' : '#888',
        width: '32px', height: '32px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <i className={`ti ${faved ? 'ti-heart-filled' : 'ti-heart'}`} style={{ fontSize: '15px' }} />
    </button>
  )
}


// Кнопка действия в инфо-блоке карточки:
// - куплен или бесплатный → скачать
// - платный, в корзине    → убрать из корзины
// - платный, не в корзине → добавить в корзину
function ActionButton({
  productId, price, isInCart = false, isPurchased = false,
}: {
  productId: string; price: number | null; isInCart?: boolean; isPurchased?: boolean
}) {
  const [inCart, setInCart] = useState(isInCart)
  const [loading, setLoading] = useState(false)

  const isFree = price === null
  const canDownload = isFree || isPurchased

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await fetch(`/api/download/${productId}`)
      const data = await res.json()
      if (data.downloadUrl) {
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.click()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCartToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    if (inCart) {
      const res = await fetch('/api/cart', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId }),
      })
      if (res.ok) {
        const data = await res.json()
        setInCart(false)
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: data.count } }))
      }
    } else {
      const res = await fetch('/api/cart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId }),
      })
      if (res.ok) {
        const data = await res.json()
        setInCart(true)
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: data.count } }))
      }
    }
    setLoading(false)
  }

  const btnBase: React.CSSProperties = {
    border: '1px solid', borderRadius: '50%',
    width: '28px', height: '28px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, transition: 'all 0.2s',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  }

  if (canDownload) {
    return (
      <button
        aria-label="Скачать"
        onClick={handleDownload}
        disabled={loading}
        style={{
          ...btnBase,
          background: 'rgba(0,182,155,0.12)',
          borderColor: 'rgba(0,182,155,0.3)',
          color: '#00B69B',
        }}
      >
        <i className="ti ti-download" style={{ fontSize: '14px' }} />
      </button>
    )
  }

  return (
    <button
      aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
      onClick={handleCartToggle}
      disabled={loading}
      style={{
        ...btnBase,
        background: inCart ? 'var(--accent)' : 'rgba(72,128,255,0.08)',
        borderColor: inCart ? 'var(--accent)' : 'rgba(72,128,255,0.2)',
        color: inCart ? '#fff' : 'var(--accent)',
      }}
    >
      <i className={inCart ? 'ti ti-shopping-cart-check' : 'ti ti-shopping-cart-plus'} style={{ fontSize: '14px' }} />
    </button>
  )
}

type CardProps = {
  product: Product
}

export function ProductCard({ product }: CardProps) {
  const { id, name, author, price, rating, reviewCount, isNew, emoji, previewBg, isFavorited, isInCart, isPurchased, images } = product

  const hasImage = images && images.length > 0
  const imageUrl = hasImage ? `${S3_ENDPOINT}/${S3_BUCKET}/${images[0]}` : null

  return (
    <Link href={`/product/${id}`} style={{ textDecoration: 'none', display: 'block' }} className="card product-card">
      {/* Превью */}
      <div style={{
        height: '200px',
        position: 'relative',
        overflow: 'hidden',
        background: hasImage ? '#f5f5f5' : previewBg,
      }}>
        {hasImage ? (
          <img
            src={imageUrl!}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            className="product-card-img"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
            {emoji}
          </div>
        )}

        {/* Оверлей при hover */}
        <div className="product-card-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%)',
          opacity: 0, transition: 'opacity 0.3s',
        }} />

        {isNew && (
          <span className="badge-new">Новинка</span>
        )}

        <FavoriteButton productId={id} isFavorited={isFavorited} />
      </div>

      {/* Инфо */}
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600, marginBottom: '3px',
          color: 'var(--text)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>{author}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {price !== null ? (
              <span style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: '14px', fontWeight: 700, color: 'var(--accent)',
              }}>{price} ₽</span>
            ) : (
              <span className="badge-free--soft">Бесплатно</span>
            )}
            {(rating || reviewCount > 0) && (
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#F59E0B' }}>★</span>
                {rating ? `${rating}` : '—'} <span style={{ opacity: 0.6 }}>({reviewCount})</span>
              </span>
            )}
          </div>
          <ActionButton productId={id} price={price} isInCart={isInCart} isPurchased={isPurchased} />
        </div>
      </div>

      <style>{`
        .product-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .product-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(72,128,255,0.18); border-color: rgba(72,128,255,0.6) !important; }
        .product-card:hover .product-card-img { transform: scale(1.04); }
        .product-card:hover .product-card-overlay { opacity: 1; }
        .dark .product-card:hover { box-shadow: 0 8px 32px rgba(72,128,255,0.15); border-color: rgba(72,128,255,0.4) !important; }
      `}</style>
    </Link>
  )
}

type GridProps = {
  title?:      string
  products?:   Product[]
  showSeeAll?: boolean
}

export default function ProductGrid({
  title = 'Популярное',
  products = [],
  showSeeAll = true,
}: GridProps) {
  return (
    <section style={{ padding: '0 24px 32px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '32px 0 20px',
      }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>{title}</h2>
        {showSeeAll && (
          <Link href="/catalog" style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }} className="see-all-link">
            Смотреть все <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
          </Link>
        )}
      </div>
      <div className="cards-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <style>{`.see-all-link:hover { color: var(--accent) !important; }`}</style>
    </section>
  )
}
