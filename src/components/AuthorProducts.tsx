// src/components/AuthorProducts.tsx
'use client'

import { useState, useMemo } from 'react'
import { ProductCard } from './ProductCard'

type Product = {
  id: string; name: string; author: string
  price: number | null; rating: number | null
  reviewCount: number; isNew: boolean
  emoji: string; previewBg: string; images: string[]
  categoryName: string; revitVersions: string[]
}

type Props = {
  products: Product[]
  authorName: string
}

const SORT_OPTIONS = [
  { value: 'popular',   label: 'Популярные'  },
  { value: 'newest',    label: 'Новые'        },
  { value: 'cheap',     label: 'Дешевле'      },
  { value: 'expensive', label: 'Дороже'       },
  { value: 'rating',    label: 'По рейтингу'  },
]

const REVIT_VERSIONS = ['2025', '2024', '2023', '2022', '2021']

export default function AuthorProducts({ products, authorName }: Props) {
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('popular')
  const [category,  setCategory]  = useState('')
  const [priceType, setPriceType] = useState<'all' | 'free' | 'paid'>('all')
  const [versions,  setVersions]  = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.categoryName))
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    if (category) list = list.filter(p => p.categoryName === category)
    if (priceType === 'free') list = list.filter(p => p.price === null)
    if (priceType === 'paid') list = list.filter(p => p.price !== null)
    if (versions.length > 0) list = list.filter(p => versions.some(v => p.revitVersions.includes(v)))

    switch (sort) {
      case 'newest':    list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break
      case 'cheap':     list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break
      case 'expensive': list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break
      case 'rating':    list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
    }

    return list
  }, [products, search, sort, category, priceType, versions])

  const hasFilters = category || priceType !== 'all' || versions.length > 0

  function toggleVersion(v: string) {
    setVersions(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  function resetFilters() {
    setCategory(''); setPriceType('all'); setVersions([])
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Кнопка фильтров — слева, согласована с остальным тулбаром */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="filters-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
            background: filtersOpen ? 'rgba(72,128,255,0.08)' : 'var(--bg)',
            border: `1px solid ${filtersOpen || hasFilters ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '10px', padding: '10px 18px',
            fontSize: '13px', fontWeight: 600,
            color: filtersOpen || hasFilters ? 'var(--accent)' : 'var(--text)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-adjustments-horizontal" style={{ fontSize: '15px' }} />
          Фильтры
          {hasFilters && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
              {[category ? 1 : 0, priceType !== 'all' ? 1 : 0, versions.length].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {/* Поиск */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по семействам..."
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px 10px 40px', color: 'var(--text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' }}
            className="author-search-input"
          />
        </div>

        {/* Сортировка */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 40px 10px 14px',
              fontSize: '13px', color: 'var(--text)', outline: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              appearance: 'none', WebkitAppearance: 'none',
            }}
            className="author-sort-select"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Панель фильтров */}
      {filtersOpen && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {/* Категория */}
          {categories.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Категория</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="cat" checked={category === ''} onChange={() => setCategory('')} style={{ accentColor: 'var(--accent)' }} />
                  Все категории
                </label>
                {categories.map(c => (
                  <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" name="cat" checked={category === c} onChange={() => setCategory(c)} style={{ accentColor: 'var(--accent)' }} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Цена */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Цена</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {([['all', 'Все'], ['free', 'Бесплатные'], ['paid', 'Платные']] as const).map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="price" checked={priceType === val} onChange={() => setPriceType(val)} style={{ accentColor: 'var(--accent)' }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Версия Revit */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Версия Revit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {REVIT_VERSIONS.map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={versions.includes(v)} onChange={() => toggleVersion(v)} style={{ accentColor: 'var(--accent)' }} />
                  {v}
                </label>
              ))}
            </div>
          </div>

          {/* Сброс */}
          {hasFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={resetFilters} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }} className="reset-filters-btn">
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      {/* Активные фильтры — теги */}
      {hasFilters && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {category && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
              {category}
              <button onClick={() => setCategory('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {priceType !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
              {priceType === 'free' ? 'Бесплатные' : 'Платные'}
              <button onClick={() => setPriceType('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {versions.map(v => (
            <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
              Revit {v}
              <button onClick={() => toggleVersion(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Счётчик */}
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
        {filtered.length === products.length
          ? `${products.length} семейств`
          : `Найдено ${filtered.length} из ${products.length}`
        }
      </div>

      {/* Сетка */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <i className="ti ti-search-off" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.2 }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Ничего не найдено</p>
          <p style={{ fontSize: '13px' }}>Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="author-products-grid">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      <style>{`
        .author-products-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          padding-bottom: 64px;
        }
        .author-search-input:focus { border-color: var(--accent) !important; }
        .author-sort-select:hover  { border-color: var(--accent) !important; }
        .reset-filters-btn:hover   { border-color: var(--accent) !important; color: var(--accent) !important; }
        .filters-btn { transition: border-color 0.15s, background 0.15s, color 0.15s !important; }
        .filters-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
        @media (max-width: 1200px) { .author-products-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 900px)  { .author-products-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  { .author-products-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .author-products-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
