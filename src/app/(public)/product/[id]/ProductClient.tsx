'use client'

import { useState } from 'react'
import Link from 'next/link'
import BuyButton from '@/components/BuyButton'
import DownloadButton from '@/components/DownloadButton'
import ReviewForm from '@/components/ReviewForm'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Props = {
  product: {
    id: string; name: string; description: string | null
    price: number | null; priceOld: number | null
    previewEmoji: string | null; previewBg: string | null
    revitVersions: string[]; fileSize: string | null
    dimensions: string | null; isNew: boolean; downloads: number
    images: string[]; avgRating: number | null
    createdAt?: Date; updatedAt?: Date
    category: { name: string; slug: string }
    author: { id: string; name: string | null; image: string | null; authorProfile: { bio: string | null; city: string | null; isVerified: boolean; totalSales: number } | null }
    reviews: { id: string; rating: number; text: string | null; createdAt: Date; user: { name: string | null } }[]
  }
  isPurchased: boolean
  isFavorited: boolean
  isInCart: boolean
  isOwnProduct: boolean
  cameFromAccount?: string | null
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: `${size}px`, color: s <= Math.round(rating) ? '#F59E0B' : 'var(--border)' }}>★</span>
      ))}
    </span>
  )
}

const SPEC_ICONS: Record<string, string> = {
  'Версия Revit':  'ti-versions',
  'Формат файла': 'ti-file-3d',
  'Размер файла': 'ti-weight',
  'Категория':    'ti-tag',
  'Загружено':    'ti-calendar-plus',
  'Обновлено':    'ti-calendar-check',
}

export default function ProductClient({ product, isPurchased, isFavorited, isInCart: initialInCart, isOwnProduct, cameFromAccount }: Props) {
  const { avgRating } = product
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState<'desc' | 'params' | 'reviews'>('desc')
  const [inFavs,    setInFavs]    = useState(isFavorited)
  const [inCart,    setInCart]    = useState(initialInCart)
  const [cartLoading, setCartLoading] = useState(false)
  const [lightbox,  setLightbox]  = useState(false)

  const discount = product.priceOld && product.price
    ? Math.round((1 - product.price / product.priceOld) * 100) : null

  const imgs = product.images.length > 0 ? product.images : null
  const imgUrl = (k: string) => `${S3}/${BKT}/${k}`

  async function toggleCart() {
    setCartLoading(true)
    const method = inCart ? 'DELETE' : 'POST'
    const res = await fetch('/api/cart', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setInCart(c => !c)
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: data.count } }))
    }
    setCartLoading(false)
  }

  async function toggleFav() {
    const res = await fetch('/api/favorites', {
      method: inFavs ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    })
    if (res.ok) setInFavs(f => !f)
  }

  const specs = [
    { label: 'Версия Revit',  value: product.revitVersions.join(', ') || '—' },
    { label: 'Формат файла',  value: 'RFA (Revit Family)'                    },
    { label: 'Размер файла',  value: product.fileSize ?? '—'                 },
    { label: 'Категория',     value: product.category.name                   },
    { label: 'Загружено',     value: product.createdAt ? new Date(product.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { label: 'Обновлено',     value: product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
  ]

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>

          {/* Назад в личный кабинет — если пришли оттуда */}
          {cameFromAccount && (
            <div style={{ padding: '16px 0 0' }}>
              <Link href={`/account?tab=${cameFromAccount}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }} className="back-to-account-link">
                <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
                Назад в личный кабинет
              </Link>
            </div>
          )}

          {/* Хлебные крошки */}
          <nav style={{ padding: '16px 0', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'Главная',             href: '/' },
              { label: 'Каталог',             href: '/catalog' },
              { label: product.category.name, href: `/catalog?category=${product.category.slug}` },
              { label: product.name,          href: null },
            ].map((c, i, arr) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {c.href
                  ? <Link href={c.href} style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }} className="bc-link">{c.label}</Link>
                  : <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.label}</span>}
                {i < arr.length - 1 && <i className="ti ti-chevron-right" style={{ fontSize: '11px', opacity: 0.4 }} />}
              </span>
            ))}
          </nav>

          {/* Layout */}
          <div className="product-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', paddingBottom: '64px', alignItems: 'start' }}>

            {/* ══ Левая ══ */}
            <div>
              {/* Галерея */}
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '12px', marginBottom: '32px' }}>

                {/* Миниатюры */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(imgs ?? [null]).map((img, i) => (
                    <button key={i} onClick={() => img && setActiveImg(i)} style={{
                      width: '76px', height: '70px', padding: 0, flexShrink: 0,
                      borderRadius: '12px', overflow: 'hidden', cursor: img ? 'pointer' : 'default',
                      border: `2px solid ${activeImg === i ? 'var(--accent)' : 'transparent'}`,
                      background: img ? 'var(--bg2)' : (product.previewBg ?? '#141420'),
                      transition: 'all .18s',
                      boxShadow: activeImg === i
                        ? '0 0 0 3px rgba(72,128,255,0.18), 0 2px 10px rgba(0,0,0,0.1)'
                        : '0 1px 4px rgba(0,0,0,0.07)',
                      outline: 'none',
                    }} className="thumb-btn">
                      {img
                        ? <img src={imgUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{product.previewEmoji ?? '📦'}</span>
                      }
                    </button>
                  ))}
                </div>

                {/* Главное фото */}
                <div className="product-image-box" style={{
                  position: 'relative', borderRadius: '18px', overflow: 'hidden',
                  background: imgs ? 'var(--bg2)' : (product.previewBg ?? '#141420'),
                  aspectRatio: '4/3', cursor: imgs ? 'zoom-in' : 'default',
                  boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
                }} onClick={() => imgs && setLightbox(true)}>
                  {imgs
                    ? <img src={imgUrl(imgs[activeImg])} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .35s ease' }} className="main-img" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px' }}>{product.previewEmoji ?? '📦'}</div>
                  }

                  {product.isNew && (
                    <span className="badge-new" style={{ position: 'absolute', top: '14px', left: '14px', fontSize: '13px', padding: '6px 14px', borderRadius: '8px', letterSpacing: '0.02em' }}>
                      Новинка
                    </span>
                  )}

                  {imgs && (
                    <button onClick={e => { e.stopPropagation(); setLightbox(true) }} style={{
                      position: 'absolute', top: '14px', right: '14px',
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="ti ti-arrows-maximize" style={{ fontSize: '14px' }} />
                    </button>
                  )}

                  {imgs && imgs.length > 1 && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setActiveImg(i => Math.max(0, i-1)) }} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: activeImg > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg > 0 ? 1 : 0.3, transition: 'opacity .15s' }}>
                        <i className="ti ti-chevron-left" style={{ fontSize: '15px' }} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setActiveImg(i => Math.min(imgs.length-1, i+1)) }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: activeImg < imgs.length-1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg < imgs.length-1 ? 1 : 0.3, transition: 'opacity .15s' }}>
                        <i className="ti ti-chevron-right" style={{ fontSize: '15px' }} />
                      </button>
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: '7px', padding: '3px 10px', fontSize: '11px', color: '#fff', fontWeight: 600, letterSpacing: '0.04em' }}>
                        {activeImg + 1} / {imgs.length}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Вкладки */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
                {([
                  { key: 'desc',    label: 'Описание'                           },
                  { key: 'params',  label: 'Характеристики'                     },
                  { key: 'reviews', label: `Отзывы (${product.reviews.length})` },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    padding: '12px 24px', fontSize: '14px',
                    fontWeight: activeTab === tab.key ? 700 : 400,
                    color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: '-1px', cursor: 'pointer', transition: 'all .15s',
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Описание */}
              {activeTab === 'desc' && (
                <div style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text)' }}>
                  {product.description
                    ? <p style={{ margin: 0 }}>{product.description}</p>
                    : (
                      <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
                        <i className="ti ti-file-description" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', opacity: 0.2 }} />
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', marginTop: 0 }}>Описание не добавлено</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>Автор пока не добавил описание к этому семейству</p>
                      </div>
                    )
                  }
                </div>
              )}

              {/* Характеристики */}
              {activeTab === 'params' && (
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {specs.map((s, i) => (
                    <div key={s.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 20px',
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)',
                      borderBottom: i < specs.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={`ti ${SPEC_ICONS[s.label] ?? 'ti-info-circle'}`} style={{ fontSize: '14px', opacity: 0.6 }} />
                        {s.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Отзывы */}
              {activeTab === 'reviews' && (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <ReviewForm productId={product.id} isFree={product.price === null} isPurchased={isPurchased} onReviewAdded={() => window.location.reload()} />
                  {product.reviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
                      <i className="ti ti-message-circle" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', opacity: 0.2 }} />
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', marginTop: 0 }}>Отзывов пока нет</p>
                      <p style={{ fontSize: '13px', margin: 0 }}>Будьте первым, кто оставит отзыв на это семейство</p>
                    </div>
                  ) : product.reviews.map(r => (
                    <div key={r.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {(r.user.name ?? 'А')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{r.user.name ?? 'Аноним'}</div>
                          <Stars rating={r.rating} size={13} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.text && <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>{r.text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══ Правая ══ */}
            <div style={{ position: 'sticky', top: '24px', display: 'grid', gap: '16px' }}>

              {/* Название + мета */}
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.2, margin: '0 0 12px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                  {product.name}
                </h1>



                {/* Рейтинг + скачивания */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {avgRating ? (
                    <>
                      <Stars rating={avgRating} size={15} />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({product.reviews.length} {product.reviews.length === 1 ? 'отзыв' : 'отзывов'})</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Нет отзывов</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-download" style={{ fontSize: '12px' }} />
                    {product.downloads}
                  </span>
                </div>
              </div>

              {/* Карточка: цена + кнопки */}
              <div className="product-price-box" style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                {/* Цена */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {product.price !== null ? (
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                        {product.price.toLocaleString('ru')} ₽
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '26px', fontWeight: 700, color: 'var(--success)' }}>Бесплатно</span>
                    )}
                    {product.priceOld && <span style={{ fontSize: '16px', color: 'var(--muted)', textDecoration: 'line-through' }}>{product.priceOld.toLocaleString('ru')} ₽</span>}
                    {discount && <span style={{ background: 'rgba(226,75,74,0.1)', color: 'var(--danger)', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '7px', border: '1px solid rgba(226,75,74,0.15)' }}>−{discount}%</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="ti ti-license" style={{ fontSize: '12px' }} />
                    Стандартная лицензия · Бессрочный доступ
                  </div>
                </div>

                {/* Кнопки */}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {isOwnProduct ? (
                    <div style={{ padding: '13px', borderRadius: '11px', background: 'rgba(72,128,255,0.06)', border: '1.5px solid rgba(72,128,255,0.2)', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                      <i className="ti ti-user-check" style={{ fontSize: '15px' }} />
                      Это ваша модель
                    </div>
                  ) : product.price !== null ? (
                    isPurchased ? (
                      <DownloadButton productId={product.id} isFree={false} isPurchased={true} />
                    ) : (
                      <>
                        <BuyButton productId={product.id} price={product.price} name={product.name} />
                        <button onClick={toggleCart} disabled={cartLoading} className="cart-btn" style={{
                          width: '100%', padding: '12px',
                          background: inCart ? 'rgba(72,128,255,0.1)' : 'transparent',
                          color: 'var(--accent)',
                          border: '1.5px solid var(--accent)',
                          borderRadius: '11px', fontSize: '13px', fontWeight: 600,
                          cursor: cartLoading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          transition: 'all .18s', fontFamily: 'inherit', opacity: cartLoading ? 0.7 : 1,
                        }}>
                          <i className={`ti ${inCart ? 'ti-shopping-cart-check' : 'ti-shopping-cart-plus'}`} style={{ fontSize: '16px' }} />
                          {cartLoading ? '...' : inCart ? 'В корзине' : 'В корзину'}
                        </button>
                      </>
                    )
                  ) : (
                    <DownloadButton productId={product.id} isFree={true} isPurchased={false} />
                  )}
                  {!isOwnProduct && (
                    <button onClick={toggleFav} className="fav-btn" style={{
                      width: '100%', padding: '12px',
                      background: inFavs ? 'rgba(72,128,255,0.08)' : 'transparent',
                      color: inFavs ? 'var(--accent)' : 'var(--muted)',
                      border: `1.5px solid ${inFavs ? 'rgba(72,128,255,0.3)' : 'var(--border)'}`,
                      borderRadius: '11px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      transition: 'all .18s', fontFamily: 'inherit',
                    }}>
                      <i className={`ti ${inFavs ? 'ti-heart-filled' : 'ti-heart'}`} style={{ fontSize: '16px' }} />
                      {inFavs ? 'В избранном' : 'В избранное'}
                    </button>
                  )}
                </div>
              </div>

              {/* Характеристики в сайдбаре */}
              <div className="product-specs-box" style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                {specs.map((s, i) => (
                  <div key={s.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 16px',
                    borderBottom: i < specs.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <i className={`ti ${SPEC_ICONS[s.label] ?? 'ti-info-circle'}`} style={{ fontSize: '13px', flexShrink: 0 }} />
                      {s.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'right', maxWidth: '55%', color: 'var(--text)' }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Блок автора */}
              <div className="product-author-box" style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                padding: '18px 20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: product.author.authorProfile?.bio ? '12px' : '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: product.author.image ? '#fff' : 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
                    {product.author.image ? <img src={product.author.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (product.author.name ?? 'А')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{product.author.name}</span>
                      {product.author.authorProfile?.isVerified && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '2px 7px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(29,158,117,0.2)', whiteSpace: 'nowrap' }}>
                          <i className="ti ti-circle-check-filled" style={{ fontSize: '10px' }} />
                          Проверен
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {[
                        product.author.authorProfile?.totalSales ? `${product.author.authorProfile.totalSales.toLocaleString('ru')} продаж` : null,
                        product.author.authorProfile?.city ?? null,
                      ].filter(Boolean).join(' · ') || 'Автор'}
                    </div>
                  </div>
                </div>
                {product.author.authorProfile?.bio && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 14px' }}>{product.author.authorProfile.bio}</p>
                )}
                <Link href={isOwnProduct ? '/account' : `/author/${product.author.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '12px', fontWeight: 600,
                  textDecoration: 'none', transition: 'all .15s',
                }} className="author-btn">
                  {isOwnProduct ? 'Личный кабинет' : 'Профиль автора'}
                  <i className="ti ti-arrow-right" style={{ fontSize: '13px' }} />
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* Лайтбокс */}
        {lightbox && imgs && (
          <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <button onClick={() => setLightbox(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-x" />
            </button>
            {activeImg > 0 && (
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => i-1) }} style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chevron-left" style={{ fontSize: '20px' }} />
              </button>
            )}
            <img src={imgUrl(imgs[activeImg])} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
            {activeImg < imgs.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => i+1) }} style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chevron-right" style={{ fontSize: '20px' }} />
              </button>
            )}
          </div>
        )}

        <div style={{ height: '64px' }} className="bottom-spacer" />
      </div>

      <style>{`
        @media (max-width: 960px) { .product-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) {
          .product-layout { padding-bottom: 40px !important; }
          div[style*="76px 1fr"] { grid-template-columns: 60px 1fr !important; }
        }
        @media (min-width: 641px) { .bottom-spacer { display: none; } }

        .bc-link:hover    { color: var(--text) !important; }
        .back-to-account-link:hover { color: var(--accent) !important; }
        .author-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
        .thumb-btn:hover  { transform: scale(1.04); }
        .main-img:hover   { transform: scale(1.02); }
        .product-image-box { transition: box-shadow 0.25s; }
        .product-image-box:hover { box-shadow: var(--shadow-hover); }
        .fav-btn:hover    { border-color: var(--accent) !important; color: var(--accent) !important; }
        .cart-btn:hover   { border-color: var(--accent) !important; color: var(--accent) !important; }

        .dark .product-price-box,
        .dark .product-author-box,
        .dark .product-specs-box {
          background: var(--bg2) !important;
          border-color: rgba(255,255,255,0.07) !important;
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 20px rgba(0,0,0,0.35) !important;
        }
        .dark .fav-btn {
          border-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </>
  )
}