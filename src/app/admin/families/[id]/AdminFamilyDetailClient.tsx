'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useModerationCount } from '@/hooks/useModerationCount'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Product = {
  id: string
  name: string
  description: string
  price: string
  categorySlug: string
  revitVersions: string[]
  isPublished: boolean
  moderationStatus: 'DRAFT' | 'PENDING_SCAN' | 'PENDING' | 'BUILDING_BUNDLE' | 'BUNDLE_FAILED' | 'APPROVED' | 'REJECTED'
  moderationComment: string | null
  isBlocked: boolean
  isNew: boolean
  downloads: number
  reviewCount: number
  salesCount: number
  avgRating: number | null
  createdAt: string
  bimParams: string
  images: string[]
  emoji: string
  authorId: string
  authorName: string
  authorEmail: string
}

type Category = { slug: string; name: string }
type Props = { product: Product; categories: Category[] }

const REVIT_VERSIONS = ['2022', '2023', '2024', '2025']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
      background: checked ? 'var(--admin-accent)' : 'var(--admin-border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
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

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: '10px', fontSize: '13px',
  border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
  color: 'var(--admin-text)', outline: 'none', width: '100%',
  fontFamily: 'inherit',
}


function FileBlock({
  bimFileName, bimUploadedAt, productCreatedAt, fileDownloading, fileError, onDownload,
}: {
  bimFileName: string
  bimUploadedAt: string | null
  productCreatedAt: string
  fileDownloading: boolean
  fileError: string
  onDownload: () => void
}) {
  const uploadedDate = bimUploadedAt ? new Date(bimUploadedAt) : null
  const createdDate  = new Date(productCreatedAt)
  // Файл считается обновлённым если загружен более чем через 60 сек после создания товара
  const isNewFile = uploadedDate
    ? (uploadedDate.getTime() - createdDate.getTime()) > 60_000
    : false

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', padding: '12px 16px', borderRadius: '10px',
        background: isNewFile ? 'rgba(72,128,255,0.06)' : 'var(--admin-bg2)',
        border: `1px solid ${isNewFile ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <i className="ti ti-file-3d" style={{ fontSize: '18px', color: isNewFile ? 'var(--admin-accent)' : 'var(--admin-muted)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {bimFileName}
            </span>
            {uploadedDate && (
              <span style={{ fontSize: '11px', color: isNewFile ? 'var(--admin-accent)' : 'var(--admin-muted)' }}>
                Загружен: {uploadedDate.toLocaleString('ru', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <button onClick={onDownload} disabled={fileDownloading} style={{
          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: fileDownloading ? 'not-allowed' : 'pointer', opacity: fileDownloading ? 0.7 : 1,
        }}>
          <i className="ti ti-download" style={{ fontSize: '14px' }} />
          {fileDownloading ? 'Получаем ссылку...' : 'Скачать для проверки'}
        </button>
      </div>
      {isNewFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginTop: '8px', padding: '8px 12px',
          background: 'rgba(72,128,255,0.08)', borderRadius: '8px',
          fontSize: '12px', color: 'var(--admin-accent)', fontWeight: 600,
        }}>
          <i className="ti ti-refresh-alert" style={{ fontSize: '14px' }} />
          Автор загрузил новый файл — требует повторной проверки
        </div>
      )}
      {fileError && (
        <div style={{ fontSize: '12px', color: 'var(--admin-danger)', marginTop: '8px' }}>{fileError}</div>
      )}
    </div>
  )
}

export default function AdminFamilyDetailClient({ product, categories }: Props) {
  const router = useRouter()
  const { mutate: mutateModerationCount } = useModerationCount()
  const isBlocked = product.isBlocked
  const [name,          setName]          = useState(product.name)
  const [description,   setDescription]   = useState(product.description)
  const [price,         setPrice]         = useState(product.price)
  const [categorySlug,  setCategorySlug]  = useState(product.categorySlug)
  const [versions,      setVersions]      = useState(product.revitVersions)
  const [isPublished,   setIsPublished]   = useState(product.isPublished)
  const [isNew,         setIsNew]         = useState(product.isNew)
  const [comment,       setComment]       = useState(product.moderationComment ?? '')
  const [fileDownloading,   setFileDownloading]   = useState(false)
  const [fileError,         setFileError]         = useState('')
  const [retryLoading,      setRetryLoading]      = useState(false)
  const [retryError,        setRetryError]        = useState('')

  async function handleRetryBundle() {
    setRetryLoading(true)
    setRetryError('')
    try {
      const res = await fetch('/api/admin/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: product.id, action: 'retry_bundle' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }))
        setRetryError(err.error ?? 'Ошибка сервера')
        return
      }
      router.refresh()
    } catch {
      setRetryError('Ошибка соединения')
    } finally {
      setRetryLoading(false)
    }
  }

  const bimParams    = (() => { try { return JSON.parse(product.bimParams) } catch { return null } })()
  const bimFileName   = (bimParams?.fileName  as string | undefined) ?? ''
  const bimUploadedAt = (bimParams?.uploadedAt as string | undefined) ?? null

  async function handleDownloadFile() {
    setFileDownloading(true)
    setFileError('')
    try {
      const res = await fetch(`/api/download/${product.id}`)
      const data = await res.json()
      if (!res.ok) { setFileError(data.error ?? 'Не удалось получить файл'); return }
      window.open(data.downloadUrl, '_blank')
    } catch {
      setFileError('Ошибка соединения')
    } finally {
      setFileDownloading(false)
    }
  }
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState('')

  function toggleVersion(v: string) {
    setVersions(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Укажите название'); return }
    if (versions.length === 0) { setError('Выберите хотя бы одну версию Revit'); return }
    if (!isPublished && !comment.trim()) { setError('Укажите причину отклонения — автор должен понимать, что исправить'); return }

    setSaving(true)
    setError('')

    const res = await fetch(`/api/products/${product.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description,
        price:         price || null,
        categorySlug,
        revitVersions: versions,
        isPublished,
        isNew,
        asAdmin: true,
        moderationComment: comment.trim() || null,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Ошибка сохранения'); return }

    setSaved(true)
    // Инвалидируем счётчик модерации в сайдбаре — статус isPublished мог измениться
    mutateModerationCount()
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })

  const formatMoney = (p: string) =>
    p ? Number(p).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }) : 'Бесплатно'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--admin-muted)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          Назад
        </button>
        <Link href={`/product/${product.id}`} target="_blank" style={{
          fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          Открыть на сайте <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
        </Link>
      </div>

      {/* Баннер блокировки — карточка недоступна для модерации */}
      {isBlocked && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '16px 20px', borderRadius: '14px',
          background: product.moderationStatus === 'PENDING_SCAN'
            ? 'rgba(72,128,255,0.08)'
            : product.moderationStatus === 'BUILDING_BUNDLE'
              ? 'rgba(72,128,255,0.08)'
              : 'rgba(239,56,38,0.08)',
          border: `1px solid ${
            product.moderationStatus === 'PENDING_SCAN' || product.moderationStatus === 'BUILDING_BUNDLE'
              ? 'rgba(72,128,255,0.3)'
              : 'rgba(239,56,38,0.3)'
          }`,
        }}>
          <i className={`ti ${
            product.moderationStatus === 'PENDING_SCAN'   ? 'ti-shield-search' :
            product.moderationStatus === 'BUILDING_BUNDLE' ? 'ti-loader-2' :
            'ti-virus'
          }`}
            style={{
              fontSize: '20px', flexShrink: 0,
              color: product.moderationStatus === 'PENDING_SCAN' || product.moderationStatus === 'BUILDING_BUNDLE'
                ? 'var(--admin-accent)'
                : 'var(--admin-danger)',
            }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '4px' }}>
              {product.moderationStatus === 'PENDING_SCAN'    ? 'Файлы проверяются платформой' :
               product.moderationStatus === 'BUILDING_BUNDLE' ? 'Формируется ZIP-архив'
               : 'Файл отклонён — обнаружена угроза'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
              {product.moderationStatus === 'PENDING_SCAN'
                ? 'Карточка станет доступна для модерации после завершения проверки безопасности файлов.'
                : product.moderationStatus === 'BUILDING_BUNDLE'
                  ? 'Архив с RFA и PDF собирается в фоне. Карточка опубликуется автоматически когда архив будет готов.'
                  : `Причина: ${product.moderationComment}. Карточка заблокирована — скачивание файлов недоступно.`}
            </div>
          </div>
        </div>
      )}

      {/* Баннер ошибки генерации архива — кнопка повтора */}
      {product.moderationStatus === 'BUNDLE_FAILED' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '16px 20px', borderRadius: '14px',
          background: 'rgba(239,56,38,0.08)',
          border: '1px solid rgba(239,56,38,0.3)',
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '20px', flexShrink: 0, color: 'var(--admin-danger)', marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '4px' }}>
              Ошибка формирования архива
            </div>
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '12px' }}>
              Не удалось создать ZIP-архив с RFA и PDF. Файлы модели доступны, попробуйте повторить генерацию.
            </div>
            <button
              onClick={handleRetryBundle}
              disabled={retryLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                background: 'var(--admin-accent, #4880ff)', color: '#fff',
                fontSize: '13px', fontWeight: 700,
                cursor: retryLoading ? 'not-allowed' : 'pointer',
                opacity: retryLoading ? 0.6 : 1,
              }}
            >
              <i className="ti ti-refresh" />
              {retryLoading ? 'Запускаем...' : 'Повторить генерацию'}
            </button>
            {retryError && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--admin-danger)' }}>{retryError}</div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: 'var(--admin-bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', flexShrink: 0, overflow: 'hidden',
        }}>
          {product.images.length > 0
            ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${product.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : product.emoji
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 4px' }}>{product.name}</h1>
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
            Добавлено {formatDate(product.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', textAlign: 'center', flexShrink: 0 }}>
          {[
            { label: 'Скачиваний', value: product.downloads },
            { label: 'Продаж',     value: product.salesCount },
            { label: 'Отзывов',    value: product.reviewCount },
            ...(product.avgRating ? [{ label: 'Рейтинг', value: `★ ${product.avgRating}` }] : []),
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Author */}
      <Section title="Автор">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)' }}>{product.authorName}</div>
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>{product.authorEmail}</div>
          </div>
          <Link href={`/admin/users/${product.authorId}`} style={{
            fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            Профиль <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
          </Link>
        </div>
      </Section>

      {/* Материалы на проверку */}
      <Section title="Материалы на проверку">
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>
            Фото ({product.images.length})
          </label>
          {product.images.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>Автор не приложил фото</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {product.images.map((img, i) => (
                <a key={img + i} href={`${S3_ENDPOINT}/${S3_BUCKET}/${img}`} target="_blank" rel="noreferrer"
                  style={{ display: 'block', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                  <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>RFA файл</label>
          {!bimFileName ? (
            <p style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>Файл не найден</p>
          ) : (
            <FileBlock
              bimFileName={bimFileName ?? ""}
              bimUploadedAt={bimUploadedAt}
              productCreatedAt={product.createdAt}
              fileDownloading={fileDownloading}
              fileError={fileError}
              onDownload={handleDownloadFile}
            />
          )}

        </div>
      </Section>

      {/* Edit form */}
      {!isBlocked && <Section title="Редактирование">
        {/* Name */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '6px' }}>Название</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '6px' }}>Описание</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {/* Category + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '6px' }}>Категория</label>
            <select style={inputStyle} value={categorySlug} onChange={e => setCategorySlug(e.target.value)}>
              {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '6px' }}>Цена (₽) — пусто = бесплатно</label>
            <input style={inputStyle} type="number" min="0" value={price}
              onChange={e => setPrice(e.target.value)} placeholder="Бесплатно" />
          </div>
        </div>

        {/* Revit versions */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginBottom: '8px' }}>Версии Revit</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {REVIT_VERSIONS.map(v => (
              <button key={v} type="button" onClick={() => toggleVersion(v)} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                border: `1px solid ${versions.includes(v) ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: versions.includes(v) ? 'rgba(72,128,255,0.1)' : 'transparent',
                color: versions.includes(v) ? 'var(--admin-accent)' : 'var(--admin-muted)',
                fontWeight: versions.includes(v) ? 600 : 400,
              }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Опубликовано</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Видно всем пользователям</div>
            </div>
            <Toggle checked={isPublished} onChange={setIsPublished} />
          </div>

          {!isPublished && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-danger)', display: 'block', marginBottom: '6px' }}>
                Причина отклонения — видна автору
              </label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', borderColor: !comment.trim() ? 'rgba(239,56,38,0.4)' : 'var(--admin-border)' }}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Например: замените фото на скрин из Revit, без водяных знаков; уточните описание категории применения"
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Новинка</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Отображается бейдж "Новинка"</div>
            </div>
            <Toggle checked={isNew} onChange={setIsNew} />
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '13px', color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-alert-circle" style={{ fontSize: '15px' }} />{error}
          </div>
        )}
      </Section>}

      {/* Save */}
      {!isBlocked && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving}
          style={{
            padding: '11px 28px', borderRadius: '10px', border: 'none',
            background: saved ? 'var(--admin-success)' : 'var(--admin-accent)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить изменения'}
        </button>
      </div>}
    </div>
  )
}
