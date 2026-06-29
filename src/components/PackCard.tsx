'use client'

import Link from 'next/link'
import { useState } from 'react'

export type PackItem = {
  id:           string
  name:         string
  author:       string
  price:        number        // 0 = бесплатно
  rating:       number | null
  reviewCount:  number
  coverImage:   string | null // S3 key первого изображения
  cardCount:    number
  isInCart?:    boolean
  isPurchased?: boolean
}

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

function PackActionButton({ packId, price, isInCart = false, isPurchased = false }: {
  packId: string; price: number; isInCart?: boolean; isPurchased?: boolean
}) {
  const [inCart,  setInCart]  = useState(isInCart)
  const [loading, setLoading] = useState(false)

  const isFree = price === 0
  const canDownload = isFree || isPurchased

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setLoading(true)
    try {
      const res  = await fetch(`/api/download/pack/${packId}`)
      const data = await res.json()
      if (data.downloadUrl) {
        const a = document.createElement('a'); a.href = data.downloadUrl; a.click()
      }
    } finally { setLoading(false) }
  }

  async function handleCartToggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (loading) return
    setLoading(true)
    if (inCart) {
      const res = await fetch('/api/cart', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      if (res.ok) {
        const data = await res.json()
        setInCart(false)
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: data.count } }))
      }
    } else {
      const res = await fetch('/api/cart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
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
      <button aria-label="Скачать" onClick={handleDownload} disabled={loading}
        style={{ ...btnBase, background: 'rgba(0,182,155,0.12)', borderColor: 'rgba(0,182,155,0.3)', color: '#00B69B' }}>
        <i className="ti ti-download" style={{ fontSize: '14px' }} />
      </button>
    )
  }

  return (
    <button
      aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
      onClick={handleCartToggle} disabled={loading}
      style={{
        ...btnBase,
        background:  inCart ? 'var(--accent)' : 'rgba(72,128,255,0.08)',
        borderColor: inCart ? 'var(--accent)' : 'rgba(72,128,255,0.2)',
        color:       inCart ? '#fff'          : 'var(--accent)',
      }}>
      <i className={inCart ? 'ti ti-shopping-cart-check' : 'ti ti-shopping-cart-plus'} style={{ fontSize: '14px' }} />
    </button>
  )
}

export function PackCard({ pack }: { pack: PackItem }) {
  const { id, name, author, price, rating, reviewCount, coverImage, cardCount, isInCart, isPurchased } = pack

  const imageUrl = coverImage ? `${S3_ENDPOINT}/${S3_BUCKET}/${coverImage}` : null

  return (
    <Link href={`/pack/${id}`} style={{ textDecoration: 'none', display: 'block' }} className="card pack-card">
      {/* Превью */}
      <div style={{ height: '200px', position: 'relative', overflow: 'hidden', background: imageUrl ? '#f5f5f5' : '#141428' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            className="pack-card-img" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
            📦
          </div>
        )}

        <div className="pack-card-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%)',
          opacity: 0, transition: 'opacity 0.3s',
        }} />

        {/* Бейдж "Пак" */}
        <span style={{
          position: 'absolute', top: '10px', left: '10px',
          background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: '10px', fontWeight: 700,
          padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <i className="ti ti-stack-2" style={{ fontSize: '10px' }} />
          ПАК
        </span>

        {/* Количество карточек */}
        <span style={{
          position: 'absolute', bottom: '10px', right: '10px',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: '11px', fontWeight: 600,
          padding: '3px 8px', borderRadius: '20px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <i className="ti ti-cards" style={{ fontSize: '11px' }} />
          {cardCount}
        </span>
      </div>

      {/* Инфо */}
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600, marginBottom: '3px',
          color: 'var(--text)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>{author}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {price > 0 ? (
              <span style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                {price} ₽
              </span>
            ) : (
              <span className="badge-free--soft">Бесплатно</span>
            )}
            {(rating !== null || reviewCount > 0) && (
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#F59E0B' }}>★</span>
                {rating ? `${rating}` : '—'} <span style={{ opacity: 0.6 }}>({reviewCount})</span>
              </span>
            )}
          </div>
          <PackActionButton packId={id} price={price} isInCart={isInCart} isPurchased={isPurchased} />
        </div>
      </div>

      <style>{`
        .pack-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .pack-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.5) !important; }
        .pack-card:hover .pack-card-img { transform: scale(1.04); }
        .pack-card:hover .pack-card-overlay { opacity: 1; }
        .dark .pack-card:hover { box-shadow: 0 8px 32px rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.35) !important; }
      `}</style>
    </Link>
  )
}
