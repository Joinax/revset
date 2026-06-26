'use client'

import { useState } from 'react'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const s3Url = (key: string) => key.startsWith('http') ? key : `${S3}/${BKT}/${key}`

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: '13px', color: s <= Math.round(rating) ? '#F59E0B' : 'var(--border)' }}>★</span>
      ))}
    </span>
  )
}

type PackProduct = { id: string; name: string; price: number | null; isAvailable: boolean; images: string[]; previewEmoji: string | null; previewBg: string | null }
type Review = { id: string; rating: number; text: string; createdAt: string; userName: string | null; source: 'pack' | 'product'; productName?: string }

export type PackClientPack = {
  id: string; name: string; description: string | null; price: number
  pdfKey: string | null; bundleKey: string | null
  images: string[]
  products: PackProduct[]
  packReviews: Review[]; productReviews: Review[]
  author: { id: string; name: string | null }
  category: { name: string; slug: string }
}

type Props = {
  pack: PackClientPack
  isPurchased: boolean
  hasDownloaded: boolean
  isOwnPack: boolean
  totalProductsPrice: number
  savings: number
  savingsPct: number
}

export default function PackClient({ pack, isPurchased, hasDownloaded, isOwnPack, totalProductsPrice, savings, savingsPct  }: Props) {
  const [activeImg, setActiveImg] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc')

  const allReviews = [...pack.packReviews, ...pack.productReviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

  const isFree = pack.price === 0
  const canDownload = ((isFree && isPurchased) || (!isFree && isPurchased && hasDownloaded)) && !!pack.bundleKey
  const canDownloadPdf = !!pack.pdfKey && (pack.price === 0 || (isPurchased && hasDownloaded))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px 64px' }}>

        {/* Breadcrumbs */}
        <nav style={{ padding: '16px 0', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Главная</Link>
          <i className="ti ti-chevron-right" style={{ fontSize: '11px', opacity: 0.4 }} />
          <Link href={`/catalog?category=${pack.category.slug}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{pack.category.name}</Link>
          <i className="ti ti-chevron-right" style={{ fontSize: '11px', opacity: 0.4 }} />
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{pack.name}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', alignItems: 'start' }}>

          {/* Left */}
          <div>
            {/* Gallery */}
            {pack.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '12px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pack.images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} style={{
                      width: '76px', height: '70px', padding: 0, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${activeImg === i ? 'var(--accent)' : 'transparent'}`, background: 'var(--bg2)',
                    }}>
                      <img src={s3Url(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
                <div style={{ borderRadius: '18px', overflow: 'hidden', aspectRatio: '4/3', background: 'var(--bg2)' }}>
                  <img src={s3Url(pack.images[activeImg])} alt={pack.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
              {([{ key: 'desc', label: 'Описание' }, { key: 'reviews', label: `Отзывы (${allReviews.length})` }] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: '12px 24px', fontSize: '14px',
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit',
                }}>{tab.label}</button>
              ))}
            </div>

            {activeTab === 'desc' && (
              <div>
                {pack.description && <p style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '24px' }}>{pack.description}</p>}

                {/* Product list */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                    Включает {pack.products.length} {pack.products.length === 1 ? 'модель' : pack.products.length < 5 ? 'модели' : 'моделей'}:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pack.products.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: p.previewBg ?? '#141420', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.images[0]
                            ? <img src={s3Url(p.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '18px' }}>{p.previewEmoji ?? '📦'}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          {p.isAvailable
                            ? <Link href={`/product/${p.id}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>{p.name}</Link>
                            : <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>{p.name}</span>}
                          {!p.isAvailable && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--muted)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: '4px' }}>недоступна отдельно</span>}
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {p.price != null ? `${p.price.toLocaleString('ru')} ₽` : 'Бесплатно'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {savings > 0 && (
                    <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: '10px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>Итого по отдельности: </span>
                      <span style={{ fontWeight: 600 }}>{totalProductsPrice.toLocaleString('ru')} ₽</span>
                      <span style={{ color: 'var(--muted)', marginLeft: '16px' }}>Экономия: </span>
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>{savings.toLocaleString('ru')} ₽ ({savingsPct}%)</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'reviews' && (
              <div style={{ display: 'grid', gap: '12px' }}>
                {allReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                    <i className="ti ti-message-circle" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', opacity: 0.2 }} />
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>Отзывов пока нет</p>
                  </div>
                ) : allReviews.map(r => (
                  <div key={r.id} style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px 18px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(r.userName ?? 'А')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{r.userName ?? 'Аноним'}</div>
                        <Stars rating={r.rating} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {r.source === 'product' && r.productName && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>отзыв на «{r.productName}»</div>
                        )}
                      </div>
                    </div>
                    {r.text && <p style={{ fontSize: '13px', lineHeight: 1.7, margin: 0 }}>{r.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ position: 'sticky', top: '24px', display: 'grid', gap: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{pack.name}</h1>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px' }}>
              <div style={{ fontFamily: 'var(--font-unbounded)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                {pack.price.toLocaleString('ru')} ₽
              </div>
              {savingsPct > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '16px' }}>
                  Экономия {savingsPct}% по сравнению с отдельной покупкой
                </div>
              )}

              {pack.pdfKey && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-file-type-pdf" />
                  Включает инструкцию (PDF)
                </div>
              )}

              <div style={{ display: 'grid', gap: '8px' }}>
                {isOwnPack ? (
                  <div style={{ padding: '13px', borderRadius: '11px', background: 'rgba(72,128,255,0.06)', border: '1.5px solid rgba(72,128,255,0.2)', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
                    Это ваш пак
                  </div>
                ) : canDownload ? (
                  <button onClick={() => download('zip')} disabled={downloading} style={{
                    width: '100%', padding: '13px', borderRadius: '11px', border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}>
                    <i className="ti ti-download" />
                    {downloading ? 'Загрузка...' : 'Скачать пак'}
                  </button>
                ) : (
                  <button style={{
                    width: '100%', padding: '13px', borderRadius: '11px', border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Купить за {pack.price.toLocaleString('ru')} ₽
                  </button>
                )}

                {canDownloadPdf && (
                  <button onClick={() => download('pdf')} disabled={downloading} style={{
                    width: '100%', padding: '12px', borderRadius: '11px',
                    border: '1.5px solid var(--border)', background: 'transparent',
                    color: 'var(--text)', fontSize: '13px', fontWeight: 600,
                    cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}>
                    <i className="ti ti-file-type-pdf" />
                    Скачать PDF
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Автор: </span>
              <Link href={`/author/${pack.author.id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>{pack.author.name}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
