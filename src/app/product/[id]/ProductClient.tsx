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
    lod: string | null; revitVersions: string[]; fileSize: string | null
    dimensions: string | null; isNew: boolean; downloads: number
    category: { name: string; slug: string }
    author: { id: string; name: string | null; authorProfile: { bio: string | null; city: string | null; isVerified: boolean; totalSales: number } | null }
    reviews: { id: string; rating: number; text: string | null; createdAt: Date; user: { name: string | null } }[]
  }
}

function Stars({ rating }: { rating: number }) {
  return <span style={{ color: 'var(--accent)', fontSize: '12px' }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
}

export default function ProductClient({ product }: Props) {
  const [activeTab,   setActiveTab]   = useState<'desc' | 'params' | 'reviews'>('desc')
  const [activeThumb, setActiveThumb] = useState(0)
  const [inFavorites, setInFavorites] = useState(false)

  const discount = product.priceOld && product.price
    ? Math.round((1 - product.price / product.priceOld) * 100)
    : null

  const avgRating = product.reviews.length
    ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
    : null

  const bimParams = [
    { key: 'Формат файла',  value: 'RFA (Revit Family)'              },
    { key: 'Версия Revit',  value: product.revitVersions.join(', ')  },
    { key: 'Категория',     value: product.category.name             },
    { key: 'LOD',           value: product.lod ?? '—'               },
    { key: 'Размеры',       value: product.dimensions ?? '—'        },
    { key: 'Размер файла',  value: product.fileSize ?? '—'          },
  ]

  const thumbs = [product.previewEmoji ?? '📦', '📐', '📋', '🔧']

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />

        <div style={{ padding: '12px 24px', fontSize: '12px', color: 'var(--muted)' }}>
          <Link href="/" style={{ color: 'var(--muted)' }}>Главная</Link> {' → '}
          <Link href="/catalog" style={{ color: 'var(--muted)' }}>Каталог</Link> {' → '}
          <Link href={`/catalog?category=${product.category.slug}`} style={{ color: 'var(--muted)' }}>{product.category.name}</Link> {' → '}
          <span style={{ color: 'var(--accent)' }}>{product.name}</span>
        </div>

        <div className="product-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '20px', padding: '0 24px 40px', alignItems: 'start' }}>

          {/* Левая колонка */}
          <div>
            <ProductGallery
              images={product.images}
              productName={product.name}
              emoji={product.previewEmoji ?? '📦'}
              previewBg={product.previewBg ?? '#141420'}
              s3Endpoint={process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'}
              s3Bucket={process.env.NEXT_PUBLIC_S3_BUCKET ?? 'revset'}
            />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {thumbs.map((t, i) => (
                <button key={i} onClick={() => setActiveThumb(i)} style={{ width: '60px', height: '60px', background: 'var(--bg2)', border: `1px solid ${activeThumb === i ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Вкладки */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {([
                { key: 'desc',    label: 'Описание'                           },
                { key: 'params',  label: 'Параметры BIM'                      },
                { key: 'reviews', label: `Отзывы (${product.reviews.length})` },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '10px 18px', fontSize: '13px', color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`, marginBottom: '-1px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'desc' && (
              <div style={{ padding: '16px 0' }}>
                <p style={{ fontSize: '13px', lineHeight: 1.7 }}>{product.description ?? 'Описание отсутствует.'}</p>
              </div>
            )}

            {activeTab === 'params' && (
              <div style={{ padding: '16px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {bimParams.map(p => (
                    <div key={p.key} style={{ background: 'var(--bg2)', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px' }}>{p.key}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div style={{ padding: '16px 0', display: 'grid', gap: '8px' }}>
                <ReviewForm
                  productId={product.id}
                  isFree={product.price === null}
                  isPurchased={false}
                  onReviewAdded={() => window.location.reload()}
                />
                {product.reviews.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Отзывов пока нет.</p>
                ) : product.reviews.map(r => (
                  <div key={r.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                        {(r.user.name ?? 'А')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.user.name ?? 'Аноним'}</div>
                        <Stars rating={r.rating} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 'auto' }}>
                        {new Date(r.createdAt).toLocaleDateString('ru')}
                      </span>
                    </div>
                    {r.text && <p style={{ fontSize: '12px', lineHeight: 1.6 }}>{r.text}</p>}
                  </div>
                ))}
              </div>
)}
          </div>

          {/* Правая колонка */}
          <div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', position: 'sticky', top: '80px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>{product.name}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                {product.price !== null ? (
                  <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>{product.price} ₽</span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>Бесплатно</span>
                )}
                {product.priceOld && <span style={{ fontSize: '14px', color: 'var(--muted)', textDecoration: 'line-through' }}>{product.priceOld} ₽</span>}
                {discount && <span style={{ background: 'rgba(41,82,200,0.1)', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>−{discount}%</span>}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>Стандартная лицензия</div>

              {product.price !== null ? (
                <BuyButton productId={product.id} price={product.price} name={product.name} />
              ) : (
                <DownloadButton
                  productId={product.id}
                  isFree={true}
                  isPurchased={false}
                />
              )}

              <button onClick={() => setInFavorites(f => !f)} style={{ width: '100%', background: 'transparent', color: inFavorites ? 'var(--accent)' : 'var(--text)', border: `1px solid ${inFavorites ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', padding: '11px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <i className="ti ti-heart" style={{ fontSize: '16px' }} />
                {inFavorites ? 'В избранном' : 'В избранное'}
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

              {[
                { key: 'Формат',   value: 'RFA'                                                    },
                { key: 'Версия',   value: product.revitVersions.join(', ')                         },
                { key: 'Рейтинг',  value: avgRating ? `★ ${avgRating} (${product.reviews.length})` : 'Нет отзывов' },
                { key: 'Загрузок', value: product.downloads.toLocaleString('ru')                   },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.key}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

              <Link href={`/author/${product.author.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textDecoration: 'none' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                  {(product.author.name ?? 'А')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{product.author.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {product.author.authorProfile?.city ?? ''}{product.author.authorProfile?.isVerified ? ' · ✓ Верифицирован' : ''}
                  </div>
                </div>
                <i className="ti ti-arrow-right" style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '16px' }} />
              </Link>
            </div>
          </div>
        </div>

        <div style={{ height: '64px' }} className="bottom-spacer" />
      </div>

      <style>{`
        @media (max-width: 768px) { .product-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 480px) { .product-layout { padding: 0 16px 40px !important; } }
        @media (min-width: 641px) { .bottom-spacer { display: none; } }
      `}</style>
    </>
  )
}
