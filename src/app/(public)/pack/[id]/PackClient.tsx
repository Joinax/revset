'use client'

import { useState } from 'react'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const s3Url = (key: string | null | undefined): string | null => {
  if (!key) return null
  return key.startsWith('http') ? key : `${S3}/${BKT}/${key}`
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

type PackProduct = {
  id: string; name: string; price: number | null; isAvailable: boolean
  images: string[]; previewEmoji: string | null; previewBg: string | null
}
type Review = {
  id: string; rating: number; text: string; createdAt: string
  userName: string | null; source: 'pack' | 'product'
  productId?: string; productName?: string; productImage?: string | null
}

export type PackClientPack = {
  id: string; name: string; description: string | null; price: number
  pdfKey: string | null; bundleKey: string | null
  images: string[]
  products: PackProduct[]
  packReviews: Review[]; productReviews: Review[]
  author: {
    id: string; name: string | null; image: string | null
    authorProfile: { bio: string | null; city: string | null; isVerified: boolean; totalSales: number } | null
  }
  category: { name: string; slug: string }
}

type Props = {
  pack: PackClientPack
  isPurchased: boolean
  hasDownloaded: boolean
  isOwnPack: boolean
  isInCart: boolean
  totalProductsPrice: number
  savings: number
  savingsPct: number
}

export default function PackClient({ pack, isPurchased, hasDownloaded, isOwnPack, isInCart: initialInCart, totalProductsPrice, savings, savingsPct }: Props) {
  const [activeImg,   setActiveImg]   = useState(0)
  const [activeTab,   setActiveTab]   = useState<'desc' | 'reviews'>('desc')
  const [downloading, setDownloading] = useState(false)
  const [inCart,      setInCart]      = useState(initialInCart)
  const [cartLoading, setCartLoading] = useState(false)
  const [lightbox,    setLightbox]    = useState(false)

  const allReviews = [...pack.packReviews, ...pack.productReviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const avgRating = allReviews.length > 0
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null

  const isFree = pack.price === 0
  const canDownload = (isFree || isPurchased) && !!pack.bundleKey
  const canDownloadPdf = !!pack.pdfKey && (isFree || isPurchased)

  async function download(type: 'zip' | 'pdf') {
    setDownloading(true)
    const url = type === 'zip'
      ? `/api/download/pack/${pack.id}`
      : `/api/download/pack/${pack.id}/pdf`
    const res = await fetch(url)
    if (res.ok) {
      const { downloadUrl } = await res.json()
      window.open(downloadUrl, '_blank')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Ошибка скачивания')
    }
    setDownloading(false)
  }

  async function toggleCart() {
    setCartLoading(true)
    const res = await fetch('/api/cart', {
      method: inCart ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: pack.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setInCart(c => !c)
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: data.count } }))
    }
    setCartLoading(false)
  }

  const imgs = pack.images.length > 0 ? pack.images : null

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>

          {/* Хлебные крошки */}
          <nav style={{ padding: '16px 0', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'Главная',              href: '/' },
              { label: 'Каталог',              href: '/catalog' },
              { label: pack.category.name,     href: `/catalog?category=${pack.category.slug}` },
              { label: pack.name,              href: null },
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
          <div className="pack-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', paddingBottom: '64px', alignItems: 'start' }}>

            {/* ══ Левая ══ */}
            <div>
              {/* Галерея */}
              {imgs && (
                <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '12px', marginBottom: '32px' }}>
                  {/* Миниатюры */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {imgs.map((img, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} style={{
                        width: '76px', height: '70px', padding: 0, flexShrink: 0,
                        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                        border: `2px solid ${activeImg === i ? 'var(--accent)' : 'transparent'}`,
                        background: 'var(--bg2)', transition: 'all .18s', outline: 'none',
                        boxShadow: activeImg === i ? '0 0 0 3px rgba(72,128,255,0.18)' : '0 1px 4px rgba(0,0,0,0.07)',
                      }} className="thumb-btn">
                        <img src={s3Url(img)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>

                  {/* Главное фото */}
                  <div className="pack-image-box" style={{
                    position: 'relative', borderRadius: '18px', overflow: 'hidden',
                    background: 'var(--bg2)', aspectRatio: '4/3', cursor: 'zoom-in',
                    boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
                  }} onClick={() => setLightbox(true)}>
                    <img src={s3Url(imgs[activeImg])!} alt={pack.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .35s ease' }}
                      className="main-img" />

                    {/* Бейдж пак */}
                    <span style={{
                      position: 'absolute', top: '14px', left: '14px',
                      background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)',
                      color: '#fff', fontSize: '12px', fontWeight: 700,
                      padding: '4px 12px', borderRadius: '20px',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                      <i className="ti ti-stack-2" style={{ fontSize: '12px' }} />
                      ПАК · {pack.products.length} {pack.products.length === 1 ? 'модель' : pack.products.length < 5 ? 'модели' : 'моделей'}
                    </span>

                    <button onClick={e => { e.stopPropagation(); setLightbox(true) }} style={{
                      position: 'absolute', top: '14px', right: '14px',
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="ti ti-arrows-maximize" style={{ fontSize: '14px' }} />
                    </button>

                    {imgs.length > 1 && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setActiveImg(i => Math.max(0, i-1)) }}
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: activeImg > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg > 0 ? 1 : 0.3, transition: 'opacity .15s' }}>
                          <i className="ti ti-chevron-left" style={{ fontSize: '15px' }} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setActiveImg(i => Math.min(imgs.length-1, i+1)) }}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: activeImg < imgs.length-1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg < imgs.length-1 ? 1 : 0.3, transition: 'opacity .15s' }}>
                          <i className="ti ti-chevron-right" style={{ fontSize: '15px' }} />
                        </button>
                        <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: '7px', padding: '3px 10px', fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                          {activeImg + 1} / {imgs.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Вкладки */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
                {([
                  { key: 'desc',    label: 'Описание' },
                  { key: 'reviews', label: `Отзывы (${allReviews.length})` },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    padding: '12px 24px', fontSize: '14px',
                    fontWeight: activeTab === tab.key ? 700 : 400,
                    color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                  }}>{tab.label}</button>
                ))}
              </div>

              {/* Описание */}
              {activeTab === 'desc' && (
                <div>
                  {pack.description
                    ? <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text)', margin: 0 }}>{pack.description}</p>
                    : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                        <i className="ti ti-file-description" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', opacity: 0.2 }} />
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', marginTop: 0 }}>Описание не добавлено</p>
                      </div>
                    )}
                </div>
              )}

              {/* Отзывы */}
              {activeTab === 'reviews' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {allReviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
                      <i className="ti ti-message-circle" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', opacity: 0.2 }} />
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', marginTop: 0 }}>Отзывов пока нет</p>
                      <p style={{ fontSize: '13px', margin: 0 }}>Будьте первым, кто оставит отзыв на этот пак</p>
                    </div>
                  ) : allReviews.map(r => (
                    <div key={r.id} style={{ background: 'var(--bg2)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: r.text ? '10px' : 0 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {(r.userName ?? 'А')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.userName ?? 'Аноним'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>
                              {new Date(r.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Stars rating={r.rating} size={13} />
                            {r.source === 'product' && r.productName && r.productId && (
                              <a href={`/product/${r.productId}`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                fontSize: '11px', color: 'var(--muted)',
                                background: 'var(--bg)', border: '1px solid var(--border)',
                                padding: '2px 8px 2px 3px', borderRadius: '20px',
                                textDecoration: 'none', flexShrink: 0,
                                maxWidth: '220px', overflow: 'hidden',
                                transition: 'border-color 0.15s, color 0.15s',
                              }} className="review-product-link">
                                {r.productImage ? (
                                  <img src={`${S3}/${BKT}/${r.productImage}`} alt="" style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                  <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="ti ti-file-3d" style={{ fontSize: '9px' }} />
                                  </span>
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.productName}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      {r.text && <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text)', margin: '0 0 0 52px' }}>{r.text}</p>}
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
                  {pack.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {avgRating ? (
                    <>
                      <Stars rating={avgRating} size={15} />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({allReviews.length} {allReviews.length === 1 ? 'отзыв' : 'отзывов'})</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Нет отзывов</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-stack-2" style={{ fontSize: '12px' }} />
                    {pack.products.length} моделей
                  </span>
                </div>
              </div>

              {/* Ценовой блок */}
              <div className="pack-price-box" style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '18px', padding: '20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                {/* Цена */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {isFree ? (
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '26px', fontWeight: 700, color: 'var(--success)' }}>Бесплатно</span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                        {pack.price.toLocaleString('ru')} ₽
                      </span>
                    )}
                    {savingsPct > 0 && (
                      <span style={{ background: 'rgba(29,158,117,0.1)', color: 'var(--success)', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '7px', border: '1px solid rgba(29,158,117,0.2)', whiteSpace: 'nowrap' }}>
                        −{savingsPct}%
                      </span>
                    )}
                  </div>
                  {savingsPct > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-pig-money" style={{ fontSize: '12px', color: 'var(--success)' }} />
                      Экономия {savings.toLocaleString('ru')} ₽ по сравнению с отдельной покупкой
                    </div>
                  )}
                </div>

                {/* Состав пака — компактный список */}
                <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Состав пака
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                    {pack.products.map(p => {
                      const thumb = p.images[0] ? s3Url(p.images[0]) : null
                      const inner = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: p.previewBg ?? '#141420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {thumb
                              ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: '14px' }}>{p.previewEmoji ?? '📦'}</span>}
                          </div>
                          <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                            {p.price != null && p.price > 0 ? `${p.price.toLocaleString('ru')} ₽` : 'Бесп.'}
                          </span>
                        </div>
                      )
                      return p.isAvailable
                        ? <Link key={p.id} href={`/product/${p.id}`} style={{ textDecoration: 'none', padding: '6px 8px', borderRadius: '8px', transition: 'background .15s' }} className="pack-item-link">{inner}</Link>
                        : <div key={p.id} style={{ padding: '6px 8px', opacity: 0.65 }}>{inner}</div>
                    })}
                  </div>
                  {totalProductsPrice > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>По отдельности</span>
                      <span style={{ fontWeight: 600, color: 'var(--muted)', textDecoration: savings > 0 ? 'line-through' : 'none' }}>
                        {totalProductsPrice.toLocaleString('ru')} ₽
                      </span>
                    </div>
                  )}
                </div>

                {/* Доп. файлы */}
                {pack.pdfKey && (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-file-type-pdf" style={{ color: '#EF4444' }} />
                    Включает инструкцию (PDF)
                  </div>
                )}


                {/* Кнопки */}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {isOwnPack ? (
                    <div style={{ padding: '13px', borderRadius: '11px', background: 'rgba(72,128,255,0.06)', border: '1.5px solid rgba(72,128,255,0.2)', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                      <i className="ti ti-user-check" style={{ fontSize: '15px' }} />
                      Это ваш пак
                    </div>
                  ) : canDownload ? (
                    <button onClick={() => download('zip')} disabled={downloading} style={{
                      width: '100%', padding: '13px', borderRadius: '11px', border: 'none',
                      background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      opacity: downloading ? 0.7 : 1,
                    }}>
                      <i className="ti ti-download" />
                      {downloading ? 'Загрузка...' : 'Скачать пак (ZIP)'}
                    </button>
                  ) : (
                    <>
                      <button style={{
                        width: '100%', padding: '13px', borderRadius: '11px', border: 'none',
                        background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      }}>
                        <i className="ti ti-credit-card" />
                        {isFree ? 'Получить бесплатно' : `Купить за ${pack.price.toLocaleString('ru')} ₽`}
                      </button>
                      {!isFree && (
                        <button onClick={toggleCart} disabled={cartLoading} className="cart-btn" style={{
                          width: '100%', padding: '12px', borderRadius: '11px',
                          background: inCart ? 'rgba(72,128,255,0.1)' : 'transparent',
                          color: 'var(--accent)', border: '1.5px solid var(--accent)',
                          fontSize: '13px', fontWeight: 600,
                          cursor: cartLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          transition: 'all .18s', opacity: cartLoading ? 0.7 : 1,
                        }}>
                          <i className={`ti ${inCart ? 'ti-shopping-cart-check' : 'ti-shopping-cart-plus'}`} />
                          {cartLoading ? '...' : inCart ? 'В корзине' : 'В корзину'}
                        </button>
                      )}
                    </>
                  )}

                  {canDownloadPdf && (
                    <button onClick={() => download('pdf')} disabled={downloading} style={{
                      width: '100%', padding: '12px', borderRadius: '11px',
                      border: '1.5px solid var(--border)', background: 'transparent',
                      color: 'var(--text)', fontSize: '13px', fontWeight: 600,
                      cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      transition: 'all .18s',
                    }}>
                      <i className="ti ti-file-type-pdf" />
                      Скачать инструкцию (PDF)
                    </button>
                  )}
                </div>
              </div>

              {/* Блок автора */}
              <div className="pack-author-box" style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '18px', padding: '18px 20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: pack.author.authorProfile?.bio ? '12px' : '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: pack.author.image ? '#fff' : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 700, color: '#fff', overflow: 'hidden',
                  }}>
                    {s3Url(pack.author.image)
                      ? <img src={s3Url(pack.author.image)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (pack.author.name ?? 'А')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{pack.author.name}</span>
                      {pack.author.authorProfile?.isVerified && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '2px 7px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(29,158,117,0.2)', whiteSpace: 'nowrap' }}>
                          <i className="ti ti-circle-check-filled" style={{ fontSize: '10px' }} />
                          Проверен
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {[
                        pack.author.authorProfile?.totalSales ? `${pack.author.authorProfile.totalSales.toLocaleString('ru')} продаж` : null,
                        pack.author.authorProfile?.city ?? null,
                      ].filter(Boolean).join(' · ') || 'Автор'}
                    </div>
                  </div>
                </div>
                {pack.author.authorProfile?.bio && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 14px' }}>{pack.author.authorProfile.bio}</p>
                )}
                <Link href={isOwnPack ? '/account' : `/author/${pack.author.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '12px', fontWeight: 600,
                  textDecoration: 'none', transition: 'all .15s',
                }} className="author-btn">
                  {isOwnPack ? 'Личный кабинет' : 'Профиль автора'}
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
            <img src={s3Url(imgs[activeImg])!} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
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
        @media (max-width: 960px) { .pack-layout { grid-template-columns: 1fr !important; } }
        @media (min-width: 641px) { .bottom-spacer { display: none; } }
        .review-product-link:hover { border-color: var(--accent) !important; color: var(--accent) !important; }

        .bc-link:hover    { color: var(--text) !important; }
        .author-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
        .thumb-btn:hover  { transform: scale(1.04); }
        .main-img:hover   { transform: scale(1.02); }
        .pack-image-box   { transition: box-shadow 0.25s; }
        .pack-image-box:hover { box-shadow: var(--shadow-hover); }
        .cart-btn:hover   { background: rgba(72,128,255,0.1) !important; }
        .pack-item-link:hover { background: rgba(72,128,255,0.06) !important; }
        .card-link:hover  { color: var(--accent) !important; }

        .dark .pack-price-box,
        .dark .pack-author-box {
          background: var(--bg2) !important;
          border-color: rgba(255,255,255,0.07) !important;
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 20px rgba(0,0,0,0.35) !important;
        }
      `}</style>
    </>
  )
}
