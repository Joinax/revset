'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const s3Url = (key: string) => `${S3}/${BKT}/${key}`

const MODERATION_LABELS: Record<string, string> = {
  PENDING_SCAN:    'Проверка безопасности',
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
    updatedAt: string
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  )
}

function FileDownloadBlock({
  label, icon, packId, fileType, fileName, isUpdated,
}: {
  label: string; icon: string; packId: string
  fileType: 'assembly' | 'pdf'; fileName: string; isUpdated: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function handleDownload() {
    setLoading(true); setErr('')
    try {
      const res  = await fetch(`/api/admin/packs/download?packId=${packId}&type=${fileType}`)
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Ошибка'); return }
      window.open(data.downloadUrl, '_blank')
    } catch {
      setErr('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', padding: '12px 16px', borderRadius: '10px',
        background: isUpdated ? 'rgba(72,128,255,0.06)' : 'var(--admin-bg2)',
        border: `1px solid ${isUpdated ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: '18px', color: isUpdated ? 'var(--admin-accent)' : 'var(--admin-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
        </div>
        <button onClick={handleDownload} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
          <i className="ti ti-download" style={{ fontSize: '14px' }} />
          {loading ? 'Получаем ссылку...' : 'Скачать для проверки'}
        </button>
      </div>
      {isUpdated && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginTop: '8px', padding: '8px 12px',
          background: 'rgba(72,128,255,0.08)', borderRadius: '8px',
          fontSize: '12px', color: 'var(--admin-accent)', fontWeight: 600,
        }}>
          <i className="ti ti-refresh-alert" style={{ fontSize: '14px' }} />
          {label} обновлён после создания — требует повторной проверки
        </div>
      )}
      {err && <div style={{ fontSize: '12px', color: 'var(--admin-danger)', marginTop: '6px' }}>{err}</div>}
    </div>
  )
}

export default function AdminPackDetailClient({ pack }: Props) {
  const router = useRouter()
  const [loading,   setLoading]   = useState(false)
  const [comment,   setComment]   = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [error,     setError]     = useState<string | null>(null)

  const isUpdated = (new Date(pack.updatedAt).getTime() - new Date(pack.createdAt).getTime()) > 60_000


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

  const isPending      = pack.moderationStatus === 'PENDING'
  const isScanning     = pack.moderationStatus === 'PENDING_SCAN'
  const isBuilding     = pack.moderationStatus === 'BUILDING_BUNDLE'
  const isBundleFailed = pack.moderationStatus === 'BUNDLE_FAILED'

  const fileExt = pack.assemblyFileKey?.split('.').pop()?.toUpperCase() ?? 'RVT'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back + open on site */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/admin/packs" style={{ color: 'var(--admin-muted)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="ti ti-arrow-left" /> Назад к модерации
        </Link>
      </div>

      {/* Header */}
      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--admin-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {pack.images.length > 0
            ? <img src={s3Url(pack.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <i className="ti ti-stack-2" style={{ fontSize: '28px', color: '#6366F1' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 4px' }}>{pack.name}</h1>
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
            {pack.category.name} · {pack.price.toLocaleString('ru')} ₽ · {pack.products.length} карточек · Создан {new Date(pack.createdAt).toLocaleDateString('ru')}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
          background: `${MODERATION_COLORS[pack.moderationStatus] ?? 'var(--admin-muted)'}1A`,
          color: MODERATION_COLORS[pack.moderationStatus] ?? 'var(--admin-muted)',
        }}>
          {MODERATION_LABELS[pack.moderationStatus] ?? pack.moderationStatus}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Материалы на проверку */}
          <Section title="Материалы на проверку">
            {/* Фото */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>
                Фото ({pack.images.length})
              </label>
              {pack.images.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--admin-muted)', margin: 0 }}>Автор не приложил фото</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {pack.images.map((img, i) => (
                    <a key={img + i} href={s3Url(img)} target="_blank" rel="noreferrer"
                      style={{ display: 'block', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                      <img src={s3Url(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Сборный файл RVT/RFA */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>
                Сборный файл {fileExt}
              </label>
              {!pack.assemblyFileKey ? (
                <p style={{ fontSize: '13px', color: 'var(--admin-muted)', margin: 0 }}>Файл не загружен</p>
              ) : (
                <FileDownloadBlock
                  label={`Сборный ${fileExt}`}
                  icon="ti-file-3d"
                  packId={pack.id}
                  fileType="assembly"
                  fileName={pack.assemblyFileKey.split('/').pop() ?? pack.assemblyFileKey}
                  isUpdated={isUpdated}
                />
              )}
            </div>

            {/* PDF */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>
                PDF-документация
              </label>
              {!pack.pdfKey ? (
                <p style={{ fontSize: '13px', color: 'var(--admin-muted)', margin: 0 }}>PDF не загружен</p>
              ) : (
                <FileDownloadBlock
                  label="PDF"
                  icon="ti-file-text"
                  packId={pack.id}
                  fileType="pdf"
                  fileName={pack.pdfKey.split('/').pop() ?? pack.pdfKey}
                  isUpdated={isUpdated}
                />
              )}
            </div>
          </Section>

          {/* Автор */}
          <Section title="Автор">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)' }}>{pack.author.name ?? pack.author.email}</div>
                <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>{pack.author.email}</div>
              </div>
              <Link href={`/admin/users/${pack.author.id}`} style={{ fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Профиль <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
              </Link>
            </div>
          </Section>

          {/* Description */}
          {pack.description && (
            <Section title="Описание">
              <p style={{ fontSize: '13px', lineHeight: 1.7, margin: 0, color: 'var(--admin-muted)' }}>{pack.description}</p>
            </Section>
          )}

          {/* Products */}
          <Section title={`Карточки (${pack.products.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pack.products.map(p => (
                <Link
                  key={p.id}
                  href={`/admin/families/${p.id}?from=/admin/packs/${pack.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--admin-bg2)', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(72,128,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--admin-bg2)')}
                >
                  <span style={{ color: 'var(--admin-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.name}
                    <i className="ti ti-chevron-right" style={{ fontSize: '12px', opacity: 0.6 }} />
                  </span>
                  <span style={{ color: 'var(--admin-muted)' }}>{p.price != null ? `${p.price.toLocaleString('ru')} ₽` : 'Бесплатно'}</span>
                </Link>
              ))}
            </div>
          </Section>

          {/* Reviews */}
          <Section title={`Отзывы на пак (${pack.reviews.length})`}>
            {pack.reviews.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', textAlign: 'center', padding: '8px 0' }}>Отзывов пока нет</div>
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
          </Section>
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
                <button onClick={() => handleAction('approve')} disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: 'var(--admin-success)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-check" /> Одобрить пак
                </button>
                <button onClick={() => handleAction('reject')} disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-danger)', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-x" /> Отклонить
                </button>
                {error && <div style={{ color: 'var(--admin-danger)', marginTop: '4px', fontSize: '13px' }}>{error}</div>}
              </div>
            )}

            {isScanning && (
              <div style={{ fontSize: '13px', color: '#6366F1', textAlign: 'center', padding: '12px', background: 'rgba(99,102,241,0.08)', borderRadius: '10px' }}>
                <i className="ti ti-shield-search" style={{ marginRight: '6px' }} />
                Файлы проходят проверку безопасности. Модерация будет доступна после завершения сканирования.
              </div>
            )}

            {isBuilding && (
              <div style={{ fontSize: '13px', color: 'var(--admin-accent)', textAlign: 'center', padding: '12px', background: 'rgba(72,128,255,0.08)', borderRadius: '10px' }}>
                <i className="ti ti-loader-2" style={{ marginRight: '6px' }} />
                Архив ZIP формируется, пожалуйста подождите...
              </div>
            )}

            {(isBundleFailed || isBuilding) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: isBundleFailed ? 'var(--admin-danger)' : 'var(--admin-accent)', padding: '12px', background: isBundleFailed ? 'rgba(239,56,38,0.08)' : 'rgba(72,128,255,0.08)', borderRadius: '10px' }}>
                  <i className={`ti ${isBundleFailed ? 'ti-alert-triangle' : 'ti-loader'}`} style={{ marginRight: '6px' }} />
                  {isBundleFailed
                    ? 'Ошибка формирования архива. Файлы пака доступны, попробуйте повторить.'
                    : 'Архив формируется. Если процесс завис — запустите повторно.'}
                </div>
                <button onClick={() => handleAction('retry_bundle')} disabled={loading}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
                  <i className="ti ti-refresh" /> Повторить генерацию
                </button>
                {error && <div style={{ color: 'var(--admin-danger)', fontSize: '13px' }}>{error}</div>}
              </div>
            )}

            {!isPending && !isBuilding && !isBundleFailed && !isScanning && (
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', textAlign: 'center', padding: '8px' }}>
                Статус: <strong style={{ color: MODERATION_COLORS[pack.moderationStatus] }}>{MODERATION_LABELS[pack.moderationStatus] ?? pack.moderationStatus}</strong>
                {pack.moderationComment && <div style={{ marginTop: '8px', color: 'var(--admin-text)' }}>{pack.moderationComment}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
