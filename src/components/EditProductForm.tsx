'use client'

import { useState, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import FileUpload from './FileUpload'
import PdfUpload from './PdfUpload'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

const REVIT_VERSIONS = ['2022', '2023', '2024', '2025']

type Props = {
  productId:  string
  categories: { slug: string; name: string }[]
  onSuccess:  () => void
  onCancel:   () => void
}

export default function EditProductForm({ productId, categories, onSuccess, onCancel }: Props) {
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError,   setFetchError]   = useState('')

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [price,       setPrice]       = useState('')
  const [category,    setCategory]    = useState('')
  const [versions,    setVersions]    = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [images,      setImages]      = useState<string[]>([])
  const [newImages,   setNewImages]   = useState<{ fileKey: string; url: string; name: string }[]>([])

  // RFA файл
  const [existingFileName, setExistingFileName] = useState('')
  const [newFileKey,        setNewFileKey]       = useState('')
  const [newFileName,       setNewFileName]      = useState('')

  // PDF
  const [existingPdfKey, setExistingPdfKey] = useState<string | null>(null)
  const [newPdfKey,      setNewPdfKey]      = useState('')
  const [clearPdf,       setClearPdf]       = useState(false)

  // Мета
  const [moderationStatus,  setModerationStatus]  = useState('')
  const [moderationComment, setModerationComment] = useState<string | null>(null)
  const [mainIndex,         setMainIndex]          = useState(0)

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) throw new Error('load failed')
        const p = await res.json()

        setName(p.name ?? '')
        setDescription(p.description ?? '')
        setPrice(p.price ?? '')
        setCategory(p.categorySlug ?? '')
        setVersions(p.revitVersions ?? [])
        setIsPublished(p.isPublished ?? false)
        setImages(p.images ?? [])
        setExistingPdfKey(p.pdfKey ?? null)
        setModerationStatus(p.moderationStatus ?? '')
        setModerationComment(p.moderationComment ?? null)

        try {
          const bp = JSON.parse(p.bimParams || '{}')
          setExistingFileName(bp.fileName ?? bp.rfaKey?.split('/').pop() ?? '')
        } catch { /* */ }
      } catch {
        setFetchError('Не удалось загрузить данные модели')
      } finally {
        setFetchLoading(false)
      }
    }
    load()
  }, [productId])

  function toggleVersion(v: string) {
    setVersions(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim())           { setError('Укажите название'); return }
    if (versions.length === 0)  { setError('Выберите хотя бы одну версию Revit'); return }

    setSaving(true)
    try {
      const sortedImages = mainIndex > 0
        ? [images[mainIndex], ...images.filter((_, i) => i !== mainIndex)]
        : images

      const res = await fetch(`/api/products/${productId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          name.trim(),
          description,
          price:         price || null,
          categorySlug:  category,
          revitVersions: versions,
          isPublished:   moderationStatus === 'REJECTED' ? true : isPublished,
          images:        sortedImages,
          newImageKeys:  newImages.map(i => i.fileKey),
          ...(newFileKey && { fileKey: newFileKey, fileName: newFileName }),
          clearPdfKey:   clearPdf,
          ...(newPdfKey && { newPdfKey }),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка сохранения'); return }

      setSuccess(true)
      setTimeout(onSuccess, 1200)
    } catch {
      setError('Ошибка соединения')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }

  if (fetchLoading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
      <i className="ti ti-loader" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }} />
      Загрузка...
    </div>
  )

  if (fetchError) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{fetchError}</div>
  )

  if (success) return (
    <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <i className="ti ti-circle-check" style={{ fontSize: '48px', color: '#1D9E75', display: 'block', marginBottom: '12px' }} />
      <div style={{ fontSize: '16px', fontWeight: 600 }}>Сохранено!</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'grid', gap: '20px' }}>

      {/* Баннер отклонения */}
      {moderationStatus === 'REJECTED' && (
        <div style={{ display: 'flex', gap: '12px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,56,38,0.07)', border: '1px solid rgba(239,56,38,0.25)' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '18px', color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Модератор отклонил модель</div>
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {moderationComment || 'Причина не указана. Исправьте и отправьте повторно.'}
            </div>
          </div>
        </div>
      )}

      {/* Название */}
      <div>
        <label style={labelStyle}>Название *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>

      {/* Описание */}
      <div>
        <label style={labelStyle}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
      </div>

      {/* Категория + цена */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Категория</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Цена (₽) — пусто = бесплатно</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Бесплатно" min="0" style={inputStyle} />
        </div>
      </div>

      {/* Версии Revit */}
      <div>
        <label style={labelStyle}>Версии Revit *</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {REVIT_VERSIONS.map(v => (
            <button key={v} type="button" onClick={() => toggleVersion(v)}
              style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', border: `1px solid ${versions.includes(v) ? 'var(--accent)' : 'var(--border)'}`, background: versions.includes(v) ? 'rgba(41,82,200,0.1)' : 'var(--bg)', color: versions.includes(v) ? 'var(--accent)' : 'var(--muted)', fontWeight: versions.includes(v) ? 600 : 400 }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Фотографии */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={labelStyle}>Фотографии</label>

        {images.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
              Текущие фото (нажмите × чтобы удалить, нажмите на фото чтобы сделать главным):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {images.map((img, i) => (
                <div key={img + i} onClick={() => setMainIndex(i)}
                  style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${i === mainIndex ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer' }}>
                  <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === mainIndex && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent)', fontSize: '9px', color: '#fff', textAlign: 'center', padding: '2px', fontWeight: 700 }}>Главное</div>
                  )}
                  <button type="button" onClick={ev => { ev.stopPropagation(); setImages(prev => { const n = prev.filter((_, idx) => idx !== i); if (mainIndex >= n.length) setMainIndex(Math.max(0, n.length - 1)); return n }) }}
                    style={{ position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '11px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Добавить новые фото:</div>
          <ImageUpload onImagesChange={imgs => setNewImages(imgs)} />
        </div>
      </div>

      {/* RFA файл */}
      <div>
        <label style={labelStyle}>
          RFA / RVT файл
          {existingFileName && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> — текущий: {existingFileName}</span>}
        </label>
        <FileUpload onUpload={(key, file) => { setNewFileKey(key); setNewFileName(file) }} />
        {existingFileName && !newFileKey && (
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>Загрузите новый файл только если хотите заменить текущий</div>
        )}
      </div>

      {/* PDF */}
      <div>
        <label style={labelStyle}>PDF-инструкция</label>
        {existingPdfKey && !clearPdf ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: '20px', color: '#E24B4A' }} />
            <span style={{ fontSize: '13px', flex: 1 }}>PDF загружен</span>
            <button type="button" onClick={() => setClearPdf(true)} style={{ fontSize: '12px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Удалить</button>
          </div>
        ) : (
          <PdfUpload onUpload={key => { setNewPdfKey(key); setClearPdf(false) }} onClear={() => setNewPdfKey('')} />
        )}
      </div>

      {/* Статус публикации */}
      {moderationStatus !== 'REJECTED' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" onClick={() => setIsPublished(v => !v)}
            style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', background: isPublished ? 'var(--accent)' : 'var(--bg3)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: '3px', left: isPublished ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontSize: '13px' }}>{isPublished ? 'Опубликовано' : 'Черновик'}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={saving}
        style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: saving ? 'var(--bg3)' : 'var(--accent)', color: '#fff', fontSize: '13px', fontFamily: 'var(--font-unbounded), sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving
          ? 'Сохраняем...'
          : moderationStatus === 'REJECTED'
            ? 'Отправить на повторную проверку'
            : 'Сохранить изменения'}
      </button>

    </form>
  )
}
