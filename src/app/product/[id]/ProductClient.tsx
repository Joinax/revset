'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BuyButton from '@/components/BuyButton'
import DownloadButton from '@/components/DownloadButton'
import ProductGallery from '@/components/ProductGallery'
import ReviewForm from '@/components/ReviewForm'

type Props = {
  product: {
    id: string; name: string; description: string | null
    price: number | null; priceOld: number | null
    previewEmoji: string | null; previewBg: string | null
    revitVersions: string[]; fileSize: string | null
    dimensions: string | null; isNew: boolean; downloads: number
    images: string[]
    avgRating: number | null
    category: { name: string; slug: string }
    author: { id: string; name: string | null; authorProfile: { bio: string | null; city: string | null; isVerified: boolean; totalSales: number } | null }
    reviews: { id: string; rating: number; text: string | null; createdAt: Date; user: { name: string | null } }[]
  }
  isPurchased: boolean
  isFavorited: boolean
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: `${size}px`, color: s <= Math.round(rating) ? '#F59E0B' : '#DDD' }}>★</span>
      ))}
    </span>
  )
}

export default function ProductClient({ product, isPurchased, isFavorited }: Props) {
  const { avgRating } = product
  const [activeTab,   setActiveTab]   = useState<'desc' | 'params' | 'reviews'>('desc')
  const [inFavorites, setInFavorites] = useState(isFavorited)

  const discount = product.priceOld && product.price
    ? Math.round((1 - product.price / product.priceOld) * 100)
    : null

  const bimParams = [
    { key: 'Формат файла', value: 'RFA (Revit Family)'             },
    { key: 'Версия Revit', value: product.revitVersions.join(', ') },
    { key: 'Категория',    value: product.category.name            },
    { key: 'Размеры',      value: product.dimensions ?? '—'       },
    { key: 'Размер файла', value: product.fileSize ?? '—'         },
  ]

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Хлебные крошки */}
          <div style={{ padding: '14px 24px', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'var(--muted)' }}>Главная</Link>
            <span style={{ opacity: 0.4 }}>›</span>
            <Link href="/catalog" style={{ color: 'var(--muted)' }}>Каталог</Link>
            <span style={{ opacity: 0.4 }}>›</span>
            <Link href={`/catalog?category=${product.category.slug}`} style={{ color: 'var(--muted)' }}>{product.category.name}</Link>
            <span style={{ opacity: 0.4 }}>›</span>
            <span style={{ color: 'var(--text)' }}>{product.name}</span>
          </div>

          {/* Основной layout */}
          <div className="product-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '28px', padding: '0 24px 48px', alignItems: 'start' }}>

            {/* Левая колонка */}
            <div style={{ minWidth: 0 }}>
              <ProductGallery
                images={product.images}
                productName={product.name}
                emoji={product.previewEmoji ?? '📦'}
                previewBg={product.previewBg ?? '#141420'}
                s3Endpoint={process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'}
                s3Bucket={process.env.NEXT_PUBLIC_S3_BUCKET ?? 'revset'}
              />

              {/* Вкладки */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginTop: '8px' }}>
                {([
                  { key: 'desc',    label: 'Описание'                           },
                  { key: 'params',  label: 'Параметры BIM'                      },
                  { key: 'reviews', label: `Отзывы (${product.reviews.length})` },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '12px 20px', fontSize: '13px', fontWeight: activeTab === tab.key ? 700 : 400,
                      color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                      background: 'none', border: 'none',
                      borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                      marginBottom: '-2px', cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'color 0.15s',
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'desc' && (
                <div style={{ padding: '20px 0' }}>
                  {product.description ? (
                    <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text)' }}>{product.description}</p>
                  ) : (
                    <p style={{ fontSize: '14px', color: 'var(--muted)', fontStyle: 'italic' }}>Описание не добавлено.</p>
                  )}
                </div>
              )}

              {activeTab === 'params' && (
                <div style={{ padding: '20px 0' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {bimParams.map((p, i) => (
                      <div key={p.key} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px',
                        background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)',
                        borderBottom: i < bimParams.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{p.key}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div style={{ padding: '20px 0', display: 'grid', gap: '12px' }}>
                  <ReviewForm
                    productId={product.id}
                    isFree={product.price === null}
                    isPurchased={isPurchased}
                    onReviewAdded={() => window.location.reload()}
                  />
                  {product.reviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
                      <i className="ti ti-message-circle" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
                      <p style={{ fontSize: '14px' }}>Отзывов пока нет</p>
                    </div>
                  ) : product.reviews.map(r => (
                    <div key={r.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {(r.user.name ?? 'А')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{r.user.name ?? 'Аноним'}</div>
                          <StarRating rating={r.rating} size={13} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {r.text && <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>{r.text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Правая колонка */}
            <div style={{ position: 'sticky', top: '80px' }}>

              {/* Название */}
              <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3, fontFamily: 'var(--font-manrope)' }}>
                {product.name}
              </h1>

              {/* Рейтинг */}
              {avgRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <StarRating rating={avgRating} size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{avgRating}</span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>({product.reviews.length} {product.reviews.length === 1 ? 'отзыв' : 'отзывов'})</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '4px' }}>· {product.downloads} скачали</span>
                </div>
              )}

              {/* Цена */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                  {product.price !== null ? (
                    <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '30px', fontWeight: 700, color: 'var(--text)' }}>{product.price} ₽</span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '22px', fontWeight: 700, color: '#1D9E75' }}>Бесплатно</span>
                  )}
                  {product.priceOld && (
                    <span style={{ fontSize: '16px', color: 'var(--muted)', textDecoration: 'line-through' }}>{product.priceOld} ₽</span>
                  )}
                  {discount && (
                    <span style={{ background: '#E24B4A', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>−{discount}%</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Стандартная лицензия · Бессрочный доступ
                </div>

                {product.price !== null ? (
                  isPurchased ? (
                    <DownloadButton productId={product.id} isFree={false} isPurchased={true} />
                  ) : (
                    <BuyButton productId={product.id} price={product.price} name={product.name} />
                  )
                ) : (
                  <DownloadButton productId={product.id} isFree={true} isPurchased={false} />
                )}

                <button
                  onClick={async () => {
                    const method = inFavorites ? 'DELETE' : 'POST'
                    const res = await fetch('/api/favorites', {
                      method, headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ productId: product.id }),
                    })
                    if (res.ok) setInFavorites(f => !f)
                  }}
                  style={{
                    width: '100%', marginTop: '8px',
                    background: inFavorites ? 'rgba(41,82,200,0.08)' : 'transparent',
                    color: inFavorites ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${inFavorites ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className={`ti ${inFavorites ? 'ti-heart-filled' : 'ti-heart'}`} style={{ fontSize: '16px' }} />
                  {inFavorites ? 'В избранном' : 'В избранное'}
                </button>
              </div>

              {/* Характеристики */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Характеристики
                </div>
                {[
                  { key: 'Формат',    value: 'RFA',                                    icon: 'ti-file-3d'      },
                  { key: 'Версия',    value: product.revitVersions.join(', '),          icon: 'ti-versions'     },
                  { key: 'Категория', value: product.category.name,                    icon: 'ti-category'     },
                  { key: 'Загрузок',  value: product.downloads.toLocaleString('ru'),   icon: 'ti-download'     },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                      <i className={`ti ${row.icon}`} style={{ fontSize: '13px' }} />
                      {row.key}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Автор */}
              <Link href={`/author/${product.author.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px', textDecoration: 'none', transition: 'border-color 0.2s' }}
                className="author-link">
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(product.author.name ?? 'А')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                    {product.author.name}
                    {product.author.authorProfile?.isVerified && (
                      <span style={{ marginLeft: '5px', fontSize: '11px', color: '#1D9E75' }}>✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {product.author.authorProfile?.city ? `📍 ${product.author.authorProfile.city}` : 'Автор моделей'}
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: 'var(--muted)', fontSize: '16px', flexShrink: 0 }} />
              </Link>
            </div>
          </div>
        </div>

        <div style={{ height: '64px' }} className="bottom-spacer" />
      </div>

      <style>{`
        @media (max-width: 900px)  { .product-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 480px)  { .product-layout { padding: 0 16px 40px !important; } }
        @media (min-width: 641px)  { .bottom-spacer  { display: none; } }
        .author-link:hover { border-color: var(--accent) !important; }
      `}</style>
    </>
  )
}
