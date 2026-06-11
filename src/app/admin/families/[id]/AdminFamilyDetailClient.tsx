'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Product = {
  id: string
  name: string
  description: string
  price: string
  categorySlug: string
  revitVersions: string[]
  isPublished: boolean
  isNew: boolean
  downloads: number
  reviewCount: number
  salesCount: number
  avgRating: number | null
  createdAt: string
  bimParams: string
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

export default function AdminFamilyDetailClient({ product, categories }: Props) {
  const router = useRouter()
  const [name,          setName]          = useState(product.name)
  const [description,   setDescription]   = useState(product.description)
  const [price,         setPrice]         = useState(product.price)
  const [categorySlug,  setCategorySlug]  = useState(product.categorySlug)
  const [versions,      setVersions]      = useState(product.revitVersions)
  const [isPublished,   setIsPublished]   = useState(product.isPublished)
  const [isNew,         setIsNew]         = useState(product.isNew)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState('')

  function toggleVersion(v: string) {
    setVersions(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Укажите название'); return }
    if (versions.length === 0) { setError('Выберите хотя бы одну версию Revit'); return }

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
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Ошибка сохранения'); return }

    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })

  const formatMoney = (p: string) =>
    p ? Number(p).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }) : 'Бесплатно'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
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
          fontSize: '28px', flexShrink: 0,
        }}>
          {product.emoji}
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

      {/* Edit form */}
      <Section title="Редактирование">
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
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
      </div>
    </div>
  )
}
