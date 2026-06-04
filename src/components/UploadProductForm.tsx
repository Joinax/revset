// src/components/UploadProductForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from './FileUpload'

const CATEGORIES = [
  { slug: 'furniture',   name: 'Мебель'       },
  { slug: 'engineering', name: 'Инженерия'    },
  { slug: 'lighting',    name: 'Освещение'    },
  { slug: 'windows',     name: 'Окна и двери' },
]

const REVIT_VERSIONS = ['2022', '2023', '2024', '2025']

export default function UploadProductForm() {
  const router = useRouter()

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [price,       setPrice]       = useState('')
  const [category,    setCategory]    = useState('furniture')
  const [versions,    setVersions]    = useState<string[]>(['2022', '2023', '2024', '2025'])
  const [fileKey,     setFileKey]     = useState('')
  const [fileName,    setFileName]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  function toggleVersion(v: string) {
    setVersions(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Укажите название модели'); return }
    if (!fileKey)      { setError('Загрузите RFA файл'); return }
    if (versions.length === 0) { setError('Выберите хотя бы одну версию Revit'); return }

    setLoading(true)

    try {
      const res = await fetch('/api/products/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description,
          price:         price || null,
          revitVersions: versions,
          categorySlug:  category,
          fileKey,
          fileName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ошибка публикации')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push(`/product/${data.productId}`), 1500)

    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <i className="ti ti-circle-check" style={{ fontSize: '48px', color: '#1D9E75', display: 'block', marginBottom: '12px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Модель опубликована!</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Переходим на страницу товара...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>

      {/* Название */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
          Название модели *
        </label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Кресло Herman Miller Aeron" required
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Описание */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Описание</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Подробное описание модели..." rows={3}
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)' }}
        />
      </div>

      {/* Категория и цена */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Категория *</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Цена (₽) — пусто = бесплатно</label>
          <input
            type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="0 = бесплатно" min="0"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Версии Revit */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Версии Revit *</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {REVIT_VERSIONS.map(v => (
            <button
              key={v} type="button"
              onClick={() => toggleVersion(v)}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                border: `1px solid ${versions.includes(v) ? 'var(--accent)' : 'var(--border)'}`,
                background: versions.includes(v) ? 'rgba(41,82,200,0.1)' : 'var(--bg)',
                color: versions.includes(v) ? 'var(--accent)' : 'var(--muted)',
                fontWeight: versions.includes(v) ? 600 : 400,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Загрузка файла */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>RFA файл *</label>
        <FileUpload onUpload={(key, file) => { setFileKey(key); setFileName(file) }} />
      </div>

      {error && (
        <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading || !fileKey}
        style={{
          width: '100%', background: loading || !fileKey ? 'var(--bg3)' : 'var(--accent)',
          color: '#fff', border: 'none', borderRadius: '8px', padding: '13px',
          fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '13px', fontWeight: 700,
          cursor: loading || !fileKey ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Публикуем...' : !fileKey ? 'Сначала загрузите файл' : 'Опубликовать модель'}
      </button>

    </form>
  )
}
