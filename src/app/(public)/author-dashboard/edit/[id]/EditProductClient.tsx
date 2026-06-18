// src/app/author-dashboard/edit/[id]/EditProductClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Props = {
  product: {
    id: string; name: string; description: string
    price: string; isPublished: boolean; categorySlug: string
    revitVersions: string[]; bimParams: string; images: string[]
  }
  categories: { slug: string; name: string }[]
}

const REVIT_VERSIONS = ['2022', '2023', '2024', '2025']

export default function EditProductClient({ product, categories }: Props) {
  const router = useRouter()

  const [name,        setName]        = useState(product.name)
  const [description, setDescription] = useState(product.description)
  const [price,       setPrice]       = useState(product.price)
  const [category,    setCategory]    = useState(product.categorySlug)
  const [versions,    setVersions]    = useState<string[]>(product.revitVersions)
  const [images,      setImages]      = useState<string[]>(product.images)
  const [isPublished, setIsPublished] = useState(product.isPublished)
  const [fileKey,     setFileKey]     = useState(() => {
    try { return JSON.parse(product.bimParams)?.fileKey ?? '' } catch { return '' }
  })
  const [fileName, setFileName] = useState(() => {
    try { return JSON.parse(product.bimParams)?.fileName ?? '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  function toggleVersion(v: string) {
    setVersions(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Укажите название'); return }
    if (versions.length === 0) { setError('Выберите хотя бы одну версию Revit'); return }

    setLoading(true)

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description,
          price:         price || null,
          categorySlug:  category,
          revitVersions: versions,
          isPublished,
          fileKey,
          fileName,
          images,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка сохранения'); return }

      setSuccess(true)
      setTimeout(() => router.push('/account?tab=author-products'), 1500)

    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/account?tab=author-products" style={{ color: 'var(--muted)', fontSize: '13px' }}>
            ← Назад
          </Link>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Редактировать модель</h1>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <i className="ti ti-circle-check" style={{ fontSize: '48px', color: '#1D9E75', display: 'block', marginBottom: '12px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Сохранено!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '16px' }}>

              {/* Название */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Название *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
              </div>

              {/* Описание */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
              </div>

              {/* Категория и цена */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Категория</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Цена (₽) — пусто = бесплатно</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Бесплатно" min="0"
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
                </div>
              </div>

              {/* Загруженные фото */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  Фото ({images.length})
                </label>
                {images.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Фото не загружены</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
                    {images.map((img, i) => (
                      <div key={img + i} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <i className="ti ti-x" style={{ fontSize: '12px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                  Крестик удаляет фото после нажатия «Сохранить». Загрузка новых фото здесь пока не поддержана.
                </p>
              </div>

              {/* Версии Revit */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Версии Revit *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {REVIT_VERSIONS.map(v => (
                    <button key={v} type="button" onClick={() => toggleVersion(v)}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                        border: `1px solid ${versions.includes(v) ? 'var(--accent)' : 'var(--border)'}`,
                        background: versions.includes(v) ? 'rgba(41,82,200,0.1)' : 'var(--bg)',
                        color: versions.includes(v) ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: versions.includes(v) ? 600 : 400,
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Статус публикации */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" onClick={() => setIsPublished(p => !p)}
                  style={{
                    width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                    background: isPublished ? 'var(--accent)' : 'var(--bg3)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}>
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: isPublished ? '21px' : '3px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {isPublished ? 'Опубликовано' : 'Черновик'}
                </span>
              </div>

              {/* Замена файла */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  RFA файл {fileName && <span style={{ color: 'var(--accent)' }}>— текущий: {fileName}</span>}
                </label>
                <FileUpload onUpload={(key, file) => { setFileKey(key); setFileName(file) }} />
                {fileName && !fileKey.includes('/') && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                    Загрузите новый файл только если хотите заменить текущий
                  </p>
                )}
              </div>

              {error && (
                <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              {/* Кнопки */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading}
                  style={{ flex: 1, background: loading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <Link href="/account?tab=author-products"
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text)', textAlign: 'center', fontWeight: 500 }}>
                  Отмена
                </Link>
              </div>

            </div>
          </form>
        )}
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
