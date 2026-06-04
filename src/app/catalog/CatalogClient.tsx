'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { ProductCard } from '@/components/ProductCard'
import FilterSidebar, { type Filters } from '@/components/FilterSidebar'

type Product = {
  id: string; name: string; author: string; price: number | null
  rating: number; reviewCount: number; isNew: boolean
  emoji: string; previewBg: string; revitVersions: string[]; categorySlug: string
}
type Category = { slug: string; name: string; count: string; emoji: string; iconBg: string; id: string }

const SORT_OPTIONS = [
  { value: 'popular',   label: 'По популярности' },
  { value: 'newest',    label: 'Сначала новые'   },
  { value: 'cheap',     label: 'Сначала дешевле' },
  { value: 'expensive', label: 'Сначала дороже'  },
]

const DEFAULT_FILTERS: Filters = {
  categories: [], revitVersions: [], priceType: ['free', 'paid'], priceMin: '', priceMax: '',
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: 'var(--muted)' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, fontSize: '14px' }}>×</button>
    </span>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(total, 5) }, (_, i) => i + 1)
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '20px 0' }}>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${p === current ? 'var(--accent)' : 'var(--border)'}`, background: p === current ? 'var(--accent)' : 'var(--bg2)', color: p === current ? '#fff' : 'var(--muted)', fontSize: '13px', cursor: 'pointer', fontWeight: p === current ? 700 : 400 }}>
          {p}
        </button>
      ))}
      {total > 5 && (
        <button onClick={() => onChange(total)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>{total}</button>
      )}
    </div>
  )
}

export default function CatalogClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState('popular')
  const [page, setPage]       = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeChips = [
    ...filters.categories.map(c => ({ label: categories.find(x => x.id === c)?.name ?? c, clear: () => setFilters(f => ({ ...f, categories: f.categories.filter(x => x !== c) })) })),
    ...filters.revitVersions.map(v => ({ label: v, clear: () => setFilters(f => ({ ...f, revitVersions: f.revitVersions.filter(x => x !== v) })) })),
  ]

  const filtered = useMemo(() => {
    let result = products
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (filters.categories.length > 0) result = result.filter(p => filters.categories.includes(p.categorySlug))
    if (filters.revitVersions.length > 0) result = result.filter(p => filters.revitVersions.some(v => p.revitVersions.includes(v.replace('Revit ', ''))))
    if (!filters.priceType.includes('free')) result = result.filter(p => p.price !== null)
    if (!filters.priceType.includes('paid')) result = result.filter(p => p.price === null)
    if (filters.priceMin) result = result.filter(p => p.price === null || p.price >= Number(filters.priceMin))
    if (filters.priceMax) result = result.filter(p => p.price === null || p.price <= Number(filters.priceMax))
    if (sort === 'cheap') result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    if (sort === 'expensive') result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    return result
  }, [filters, search, sort, products])

  const PER_PAGE = 6
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageProducts = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleFiltersChange(f: Filters) { setFilters(f); setPage(1) }

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />

        <div style={{ margin: '18px 24px', display: 'flex', gap: '10px' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Поиск по названию..." style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
          <button style={{ background: 'var(--accent)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-search" style={{ fontSize: '15px' }} />
            <span className="search-btn-text">Найти</span>
          </button>
          <button onClick={() => setDrawerOpen(true)} className="filter-mobile-btn" style={{ display: 'none', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', cursor: 'pointer', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap' }}>
            <i className="ti ti-adjustments-horizontal" style={{ fontSize: '16px' }} />
            Фильтры
            {activeChips.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>{activeChips.length}</span>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr' }} className="catalog-layout">
          <div style={{ borderRight: '1px solid var(--border)', minHeight: '600px' }} className="catalog-sidebar">
            <FilterSidebar filters={filters} onChange={handleFiltersChange} />
          </div>

          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Найдено {filtered.length} моделей</span>
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {activeChips.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {activeChips.map((chip, i) => <Chip key={i} label={chip.label} onRemove={chip.clear} />)}
                <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Сбросить всё</button>
              </div>
            )}

            {pageProducts.length > 0 ? (
              <div className="cards-grid">
                {pageProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <i className="ti ti-search-off" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                Ничего не найдено
              </div>
            )}

            {filtered.length > PER_PAGE && <Pagination current={page} total={totalPages} onChange={setPage} />}
          </div>
        </div>

        <div style={{ height: '64px' }} className="bottom-spacer" />
      </div>

      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderRadius: '16px 16px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Фильтры</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><i className="ti ti-x" style={{ fontSize: '20px' }} /></button>
            </div>
            <FilterSidebar filters={filters} onChange={handleFiltersChange} />
            <div style={{ padding: '0 20px 24px' }}>
              <button onClick={() => setDrawerOpen(false)} style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Показать {filtered.length} моделей
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
