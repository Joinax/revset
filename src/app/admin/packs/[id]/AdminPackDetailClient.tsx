'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const s3Url = (key: string) => `${S3}/${BKT}/${key}`

const MODERATION_LABELS: Record<string, string> = {
  PENDING:         'На проверке',
  BUILDING_BUNDLE: 'Архив формируется',
  BUNDLE_FAILED:   'Ошибка архива',
  APPROVED:        'Одобрен',
  REJECTED:        'Отклонён',
}

const MODERATION_COLORS: Record<string, string> = {
  PENDING:         'var(--admin-warning, #f59e0b)',
  BUILDING_BUNDLE: 'var(--admin-accent, #4880ff)',
  BUNDLE_FAILED:   'var(--admin-danger)',
  APPROVED:        'var(--admin-success)',
  REJECTED:        'var(--admin-danger)',
}

type PackReview = {
  id: string
  rating: number
  text: string
  moderationStatus: string
  createdAt: string
  user: { id: string; name: string | null }
}

type Props = {
  pack: {
    id: string; name: string; price: number; description: string | null
    moderationStatus: string; moderationComment: string | null
    assemblyFileKey: string | null; pdfKey: string | null; bundleKey: string | null
    images: string[]
    products: { id: string; name: string; price: number | null; moderationStatus: string }[]
    reviews: PackReview[]
    author: { id: string; name: string | null; email: string }
    category: { name: string }
    createdAt: string
  }
}

export default function AdminPackDetailClient({ pack }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(action: 'approve' | 'reject' | 'retry_bundle') {
    setError(null)
    setLoading(true)
    const res = await fetch('/api/admin/packs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ packId: pack.id, action, moderationComment: comment || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }))
      setError(err.error ?? 'Ошибка сервера')
      setLoading(false)
      return
    }
    router.refresh()
    if (action !== 'retry_bundle') router.push('/admin/packs')
  }

  const isPending       = pack.moderationStatus === 'PENDING'
  const isBuilding      = pack.moderationStatus === 'BUILDING_BUNDLE'
  const isBundleFailed  = pack.moderationStatus === 'BUNDLE_FAILED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/packs" style={{ color: 'var(--admin-muted)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="ti ti-arrow-left" /> Назад
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{pack.name}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Gallery */}
          {pack.images.length > 0 && (
            <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--admin-text)' }}>Обложка</div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pack.images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} style={{ width: '60px', height: '50px', padding: 0, borderRadius: '8px', overflow: 'hidden', border: `2px solid ${activeImg === i ? 'var(--admin-accent)' : 'transparent'}`, cursor: 'pointer', background: 'var(--admin-bg2)' }}>
                      <img src={s3Url(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--admin-bg2)' }}>
                  <img src={s3Url(pack.images[activeImg])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--admin-text)' }}>Информация</div>
            {[
              { label: 'Цена',      value: `${pack.price.toLocaleString('ru')} ₽` },
              { label: 'Автор',     value: pack.author.name ?? pack.author.email },
              { label: 'Категория', value: pack.category.name },
              { label: 'Создан',    value: new Date(pack.createdAt).toLocaleDateString('ru') },
              { label: 'Сборный RVT', value: pack.assemblyFileKey ? 'Загружен' : '—' },
              { label: 'PDF',       value: pack.pdfKey ? 'Загружен' : '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--admin-border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--admin-muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {pack.description && (
            <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--admin-text)' }}>Описание</div>
              <p style={{ fontSize: '13px', lineHeight: 1.7, margin: 0, color: 'var(--admin-muted)' }}>{pack.description}</p>
            </div>
          )}

          {/* Products */}
          <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--admin-text)' }}>
              Карточки ({pack.products.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pack.products.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--admin-bg2)', borderRadius: '8px', fontSize: '13px' }}>
                  <Link href={`/product/${p.id}`} target="_blank" style={{ color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 600 }}>{p.name}</Link>
                  <span style={{ color: 'var(--admin-muted)' }}>{p.price != null ? `${p.price.toLocaleString('ru')} ₽` : 'Бесплатно'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--admin-text)' }}>
              Отзывы на пак ({pack.reviews.length})
            </div>
            {pack.reviews.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', textAlign: 'center', padding: '16px 0' }}>Отзывов пока нет</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pack.reviews.map(r => (
                  <div key={r.id} style={{ padding: '12px', background: 'var(--admin-bg2)', borderRadius: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{r.user.name ?? 'Пользователь'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--admin-warning, #f59e0b)', fontWeight: 700 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: MODERATION_COLORS[r.moderationStatus] ?? 'var(--admin-muted)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                          {MODERATION_LABELS[r.moderationStatus] ?? r.moderationStatus}
                        </span>
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--admin-muted)', lineHeight: 1.6 }}>{r.text}</p>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--admin-muted)' }}>
                      {new Date(r.createdAt).toLocaleDateString('ru')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
          <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px', color: 'var(--admin-text)' }}>Решение модератора</div>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий (необязательно для одобрения, рекомендуется для отклонения)"
              style={{ width: '100%', minHeight: '80px', padding: '10px', background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '13px', color: 'var(--admin-text)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: '12px' }}
            />

            {isPending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: 'var(--admin-success)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-check" /> Одобрить пак
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-danger)', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-x" /> Отклонить
                </button>
                {error && (
                  <div style={{ color: 'var(--admin-danger)', marginTop: '8px', fontSize: '13px' }}>{error}</div>
                )}
              </div>
            )}

            {isBuilding && (
              <div style={{ fontSize: '13px', color: 'var(--admin-accent, #4880ff)', textAlign: 'center', padding: '12px', background: 'rgba(72,128,255,0.08)', borderRadius: '10px' }}>
                <i className="ti ti-loader-2" style={{ marginRight: '6px' }} />
                Архив ZIP формируется, пожалуйста подождите...
              </div>
            )}

            {isBundleFailed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--admin-danger)', padding: '12px', background: 'rgba(239,56,38,0.08)', borderRadius: '10px' }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: '6px' }} />
                  Ошибка формирования архива. Файлы пака доступны, попробуйте повторить.
                </div>
                <button
                  onClick={() => handleAction('retry_bundle')}
                  disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: 'var(--admin-accent, #4880ff)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-refresh" /> Повторить генерацию
                </button>
                {error && (
                  <div style={{ color: 'var(--admin-danger)', fontSize: '13px' }}>{error}</div>
                )}
              </div>
            )}

            {!isPending && !isBuilding && !isBundleFailed && (
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', textAlign: 'center', padding: '8px' }}>
                Статус: <strong style={{ color: MODERATION_COLORS[pack.moderationStatus] }}>{MODERATION_LABELS[pack.moderationStatus] ?? pack.moderationStatus}</strong>
                {pack.moderationComment && <div style={{ marginTop: '8px' }}>{pack.moderationComment}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
