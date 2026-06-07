// src/app/catalog/CatalogClient.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ProductCard } from '@/components/ProductCard'

type Product = {
  id: string; name: string; author: string; price: number | null
  rating: number | null; reviewCount: number; isNew: boolean
  emoji: string; previewBg: string; revitVersions: string[]; categorySlug: string
  images?: string[]
}
type Category = { slug: string; name: string; emoji: string; iconBg: string; id: string }
type CurrentParams = {
  q: string; sort: string; page: string; category: string
  versions: string; price: string; priceMin: string; priceMax: string
}

type Props = {
  products:      Product[]
  categories:    Category[]
  total:         number
  perPage:       number
  currentPage:   number
  currentParams: CurrentParams
}

const SORT_OPTIONS = [
  { value: 'popular',   label: 'По популярности' },
  { value: 'newest',    label: 'Сначала новые'   },
  { value: 'cheap',     label: 'Сначала дешевле' },
  { value: 'expensive', label: 'Сначала дороже'  },
]

const REVIT_VERSIONS = ['2022', '2023', '2024', '2025']

export default function CatalogClient({
  products, categories, total, perPage, currentPage, currentParams,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [search,    setSearch]    = useState(currentParams.q)
  const [priceMin,  setPriceMin]  = useState(currentParams.priceMin)
  const [priceMax,  setPriceMax]  = useState(currentParams.priceMax)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const totalPages = Math.ceil(total / perPage)

  function updateParams(updates: Partial<CurrentParams>) {
    const params = new URLSearchParams()
    const merged = { ...currentParams, ...updates, page: '1' }
    if (merged.q)        params.set('q',        merged.q)
    if (merged.category) params.set('category', merged.category)
    if (merged.versions) params.set('versions', merged.versions)
    if (merged.price && merged.price !== 'all') params.set('price', merged.price)
    if (merged.priceMin) params.set('priceMin', merged.priceMin)
    if (merged.priceMax) params.set('priceMax', merged.priceMax)
    if (merged.sort && merged.sort !== 'popular') params.set('sort', merged.sort)
    if (updates.page)    params.set('page',     updates.page)
    const query = params.toString()
    startTransition(() => { router.push(query ? `${pathname}?${query}` : pathname) })
  }

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    const timer = setTimeout(() => updateParams({ q: value }), 400)
    return () => clearTimeout(timer)
  }, [currentParams])

  function toggleVersion(v: string) {
    const current = currentParams.versions ? currentParams.versions.split(',') : []
    const updated = current.includes(v) ? current.filter(x => x !== v) : [...current, v]
    updateParams({ versions: updated.join(',') })
  }

  const activeChips = [
    ...(currentParams.category ? [{ label: categories.find(c => c.slug === currentParams.category)?.name ?? currentParams.category, clear: () => updateParams({ category: '' }) }] : []),
    ...(currentParams.versions ? currentParams.versions.split(',').map(v => ({ label: `Revit ${v}`, clear: () => toggleVersion(v) })) : []),
    ...(currentParams.price && currentParams.price !== 'all' ? [{ label: currentParams.price === 'free' ? 'Бесплатные' : 'Платные', clear: () => updateParams({ price: 'all' }) }] : []),
  ]

  const FilterContent = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Категория</div>
        {categories.map(cat => (
          <label key={cat.slug} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', cursor: 'pointer' }}>
            <span onClick={() => updateParams({ category: currentParams.category === cat.slug ? '' : cat.slug })}
              style={{ width: '15px', height: '15px', borderRadius: '3px', border: currentParams.category === cat.slug ? 'none' : '1.5px solid var(--border)', background: currentParams.category === cat.slug ? 'var(--accent)' : 'var(--bg2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}>
              {currentParams.category === cat.slug && <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }} />}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>{cat.name}</span>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Версия Revit</div>
        {REVIT_VERSIONS.map(ver => {
          const checked = currentParams.versions?.split(',').includes(ver)
          return (
            <label key={ver} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', cursor: 'pointer' }}>
              <span onClick={() => toggleVersion(ver)}
                style={{ width: '15px', height: '15px', borderRadius: '3px', border: checked ? 'none' : '1.5px solid var(--border)', background: checked ? 'var(--accent)' : 'var(--bg2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {checked && <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }} />}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{ver}</span>
            </label>
          )
        })}
      </div>

      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Цена</div>
        {[{ value: 'all', label: 'Все' }, { value: 'free', label: 'Бесплатные' }, { value: 'paid', label: 'Платные' }].map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', cursor: 'pointer' }}>
            <span onClick={() => updateParams({ price: opt.value })}
              style={{ width: '15px', height: '15px', borderRadius: '50%', border: currentParams.price === opt.value || (opt.value === 'all' && !currentParams.price) ? 'none' : '1.5px solid var(--border)', background: currentParams.price === opt.value || (opt.value === 'all' && !currentParams.price) ? 'var(--accent)' : 'var(--bg2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {(currentParams.price === opt.value || (opt.value === 'all' && !currentParams.price)) && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>{opt.label}</span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input type="number" placeholder="от" value={priceMin} onChange={e => setPriceMin(e.target.value)} onBlur={() => updateParams({ priceMin })}
            style={{ flex: 1, width: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
          <input type="number" placeholder="до" value={priceMax} onChange={e => setPriceMax(e.target.value)} onBlur={() => updateParams({ priceMax })}
            style={{ flex: 1, width: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
        </div>
      </div>

      <button onClick={() => { setSearch(''); setPriceMin(''); setPriceMax(''); router.push(pathname) }}
        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}>
        Сбросить фильтры
      </button>
    </div>
  )

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />

        {/* Весь контент ограничен по ширине */}
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* Поиск */}
          <div style={{ margin: '18px 24px', display: 'flex', gap: '10px' }}>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Поиск по названию, категории, автору..."
              style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', opacity: isPending ? 0.7 : 1 }}
            />
            <button onClick={() => setDrawerOpen(true)} className="filter-mobile-btn"
              style={{ display: 'none', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', cursor: 'pointer', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap' }}>
              <i className="ti ti-adjustments-horizontal" style={{ fontSize: '16px' }} />
              Фильтры
              {activeChips.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>{activeChips.length}</span>}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr' }} className="catalog-layout">

            {/* Сайдбар */}
            <div style={{ borderRight: '1px solid var(--border)', minHeight: '600px' }} className="catalog-sidebar">
              <FilterContent />
            </div>

            {/* Контент */}
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {isPending ? 'Загружаем...' : `Найдено ${total} моделей`}
                </span>
                <select value={currentParams.sort} onChange={e => updateParams({ sort: e.target.value })}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {activeChips.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {activeChips.map((chip, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: 'var(--muted)' }}>
                      {chip.label}
                      <button onClick={chip.clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, fontSize: '14px' }}>×</button>
                    </span>
                  ))}
                  <button onClick={() => { setSearch(''); setPriceMin(''); setPriceMax(''); router.push(pathname) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>
                    Сбросить всё
                  </button>
                </div>
              )}

              {products.length > 0 ? (
                <div className="cards-grid" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <i className="ti ti-search-off" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                  Ничего не найдено — попробуйте изменить фильтры
                </div>
              )}

              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '20px 0' }}>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => updateParams({ page: p.toString() })}
                      style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${p === currentPage ? 'var(--accent)' : 'var(--border)'}`, background: p === currentPage ? 'var(--accent)' : 'var(--bg2)', color: p === currentPage ? '#fff' : 'var(--muted)', fontSize: '13px', cursor: 'pointer', fontWeight: p === currentPage ? 700 : 400 }}>
                      {p}
                    </button>
                  ))}
                  {totalPages > 7 && (
                    <button onClick={() => updateParams({ page: totalPages.toString() })}
                      style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>
                      {totalPages}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '64px' }} className="bottom-spacer" />
        </div>
      </div>

      {/* Мобильный drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderRadius: '16px 16px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Фильтры</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <i className="ti ti-x" style={{ fontSize: '20px' }} />
              </button>
            </div>
            <FilterContent />
            <div style={{ padding: '0 20px 24px' }}>
              <button onClick={() => setDrawerOpen(false)}
                style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Показать {total} моделей
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) { .catalog-layout { grid-template-columns: 1fr !important; } .catalog-sidebar { display: none !important; } .filter-mobile-btn { display: flex !important; } }
        @media (max-width: 480px) { .search-btn-text { display: none; } }
        @media (min-width: 641px) { .bottom-spacer { display: none; } }
      `}</style>
    </>
  )
}
