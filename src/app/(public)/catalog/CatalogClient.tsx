// src/app/catalog/CatalogClient.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { PackCard } from '@/components/PackCard'

type ProductItem = {
  kind: 'product'
  id: string; name: string; author: string; price: number | null
  rating: number | null; reviewCount: number; isNew: boolean
  emoji: string; previewBg: string; revitVersions: string[]; categorySlug: string
  isFavorited?: boolean; isInCart?: boolean; isPurchased?: boolean; images?: string[]
}
type PackItem = {
  kind: 'pack'
  id: string; name: string; author: string; price: number
  rating: number | null; reviewCount: number
  coverImage: string | null; cardCount: number
  isInCart?: boolean; isPurchased?: boolean
}
type CatalogItem = ProductItem | PackItem
type Category = { slug: string; name: string; emoji: string; iconBg: string; id: string }
type CurrentParams = {
  q: string; sort: string; page: string; category: string
  versions: string; price: string; priceMin: string; priceMax: string
}
type Props = {
  items: CatalogItem[]; categories: Category[]
  total: number; perPage: number; currentPage: number; currentParams: CurrentParams
}

const SORT_OPTIONS = [
  { value: 'popular',   label: 'Популярные'      },
  { value: 'newest',    label: 'Сначала новые'   },
  { value: 'cheap',     label: 'Сначала дешевле' },
  { value: 'expensive', label: 'Сначала дороже'  },
]
const REVIT_VERSIONS = ['2025', '2024', '2023', '2022', '2021 и ниже']

export default function CatalogClient({ items, categories, total, perPage, currentPage, currentParams }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search,   setSearch]   = useState(currentParams.q)
  const [priceMin, setPriceMin] = useState(currentParams.priceMin)
  const [priceMax, setPriceMax] = useState(currentParams.priceMax)
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
    const cur = currentParams.versions ? currentParams.versions.split(',') : []
    const upd = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]
    updateParams({ versions: upd.join(',') })
  }

  const activeCategory = categories.find(c => c.slug === currentParams.category)
  const activeVersions = currentParams.versions ? currentParams.versions.split(',') : []

  const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <span onClick={onChange} style={{
      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
      border: checked ? 'none' : '1.5px solid var(--border)',
      background: checked ? 'var(--accent)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      transition: 'all .15s',
    }}>
      {checked && <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }} />}
    </span>
  )

  const FilterSidebar = () => (
    <div style={{ padding: '0 0 32px' }}>

      {/* Категории */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Категории</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {categories.map(cat => (
            <div key={cat.slug} onClick={() => updateParams({ category: currentParams.category === cat.slug ? '' : cat.slug })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                background: currentParams.category === cat.slug ? 'rgba(72,128,255,0.08)' : 'transparent',
                transition: 'background .15s',
              }} className="filter-row">
              <span style={{ fontSize: '13px', color: currentParams.category === cat.slug ? 'var(--accent)' : 'var(--text)', fontWeight: currentParams.category === cat.slug ? 600 : 400 }}>
                {cat.name}
              </span>
              {currentParams.category === cat.slug && (
                <i className="ti ti-chevron-right" style={{ fontSize: '13px', color: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>
        <div onClick={() => updateParams({ category: '' })}
          style={{ fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', marginTop: '8px', marginLeft: '10px', fontWeight: 500 }}>
          Показать все
        </div>
      </div>

      {/* Фильтры */}
      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Фильтры</h4>

      {/* Цена — слайдер */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>Цена</div>
        <div style={{ marginBottom: '10px' }}>
          <input type="range" min="0" max="50000" value={priceMax || 50000}
            onChange={e => setPriceMax(e.target.value)}
            onMouseUp={() => updateParams({ priceMax })}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            <span>от 0 ₽</span>
            <span>до {Number(priceMax || 50000).toLocaleString('ru')} ₽</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="number" placeholder="от" value={priceMin} onChange={e => setPriceMin(e.target.value)} onBlur={() => updateParams({ priceMin })}
            style={{ flex: 1, width: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
          <input type="number" placeholder="до" value={priceMax} onChange={e => setPriceMax(e.target.value)} onBlur={() => updateParams({ priceMax })}
            style={{ flex: 1, width: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
        </div>
      </div>



      {/* Версия Revit */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>Версия Revit</div>
        {REVIT_VERSIONS.map(ver => (
          <label key={ver} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <Checkbox checked={activeVersions.includes(ver)} onChange={() => toggleVersion(ver)} />
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>{ver}</span>
          </label>
        ))}
      </div>

      {/* Сброс */}
      <button onClick={() => { setSearch(''); setPriceMin(''); setPriceMax(''); router.push(pathname) }}
        style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'color .15s' }}
        className="reset-btn">
        Сбросить фильтры
      </button>
    </div>
  )

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>

          {/* Хлебные крошки — на всю ширину, над grid */}
          <nav style={{ padding: '14px 0', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }} className="bc-link">Главная</Link>
            <i className="ti ti-chevron-right" style={{ fontSize: '11px', opacity: 0.4 }} />
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>Каталог</span>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '40px', alignItems: 'start', paddingBottom: '60px', marginTop: '24px' }} className="catalog-layout">

            {/* ═══ Сайдбар ═══ */}
            <aside style={{ position: 'sticky', top: '24px' }} className="catalog-sidebar">
              <FilterSidebar />
            </aside>

            {/* ═══ Контент ═══ */}
            <main>
              {/* Заголовок + поиск + сортировка */}
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                  {activeCategory ? activeCategory.name : `${total} позиций`}
                </h1>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Поиск */}
                  <div style={{ flex: 1, minWidth: '200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: '14px', fontSize: '16px', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input value={search} onChange={e => handleSearch(e.target.value)}
                      placeholder="Поиск в каталоге..."
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 36px 10px 40px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                      className="catalog-search" />
                    {search && (
                      <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-x" style={{ fontSize: '14px' }} />
                      </button>
                    )}
                  </div>

                  {/* Сортировка */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <select value={currentParams.sort} onChange={e => updateParams({ sort: e.target.value })}
                      style={{ appearance: 'none', WebkitAppearance: 'none', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 40px 10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, minWidth: '160px' }}>
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', pointerEvents: 'none' }} />
                  </div>

                  {/* Мобильные фильтры */}
                  <button onClick={() => setDrawerOpen(true)} className="filter-mobile-btn"
                    style={{ display: 'none', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text)', cursor: 'pointer', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <i className="ti ti-adjustments-horizontal" style={{ fontSize: '16px' }} />
                    Фильтры
                    {(activeVersions.length > 0 || currentParams.category || currentParams.price !== 'all') && (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                        {activeVersions.length + (currentParams.category ? 1 : 0) + (currentParams.price && currentParams.price !== 'all' ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Активные фильтры */}
              {(activeCategory || activeVersions.length > 0 || (currentParams.price && currentParams.price !== 'all')) && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {activeCategory && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      {activeCategory.name}
                      <button onClick={() => updateParams({ category: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: '14px', lineHeight: 1 }}>×</button>
                    </span>
                  )}
                  {activeVersions.map(v => (
                    <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      Revit {v}
                      <button onClick={() => toggleVersion(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: '14px', lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  <button onClick={() => { setSearch(''); setPriceMin(''); setPriceMax(''); router.push(pathname) }}
                    style={{ fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                    Сбросить всё
                  </button>
                </div>
              )}

              {/* Сетка товаров */}
              {items.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', opacity: isPending ? 0.6 : 1, transition: 'opacity .2s' }}>
                  {items.map(item =>
                    item.kind === 'pack'
                      ? <PackCard key={`pack-${item.id}`} pack={item} />
                      : <ProductCard key={`product-${item.id}`} product={item} />
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
                  <i className="ti ti-search-off" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.25 }} />
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>Ничего не найдено</p>
                  <p style={{ fontSize: '13px' }}>Попробуйте изменить фильтры или поисковый запрос</p>
                </div>
              )}

              {/* Пагинация */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '32px 0 0' }}>
                  {currentPage > 1 && (
                    <button onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                      style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-chevron-left" style={{ fontSize: '14px' }} />
                    </button>
                  )}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => updateParams({ page: p.toString() })}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1px solid ${p === currentPage ? 'var(--accent)' : 'var(--border)'}`, background: p === currentPage ? 'var(--accent)' : 'var(--bg)', color: p === currentPage ? '#fff' : 'var(--text)', fontSize: '13px', cursor: 'pointer', fontWeight: p === currentPage ? 700 : 400, transition: 'all .15s' }}>
                      {p}
                    </button>
                  ))}
                  {totalPages > 7 && (
                    <button onClick={() => updateParams({ page: totalPages.toString() })}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>
                      {totalPages}
                    </button>
                  )}
                  {currentPage < totalPages && (
                    <button onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                      style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <i className="ti ti-chevron-right" style={{ fontSize: '14px' }} />
                    </button>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Мобильный drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderRadius: '16px 16px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>Фильтры</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <i className="ti ti-x" style={{ fontSize: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '20px' }}><FilterSidebar /></div>
            <div style={{ padding: '0 20px 24px' }}>
              <button onClick={() => setDrawerOpen(false)}
                style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Показать {total}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 900px) {
          .catalog-layout { grid-template-columns: 1fr !important; }
          .catalog-sidebar { display: none !important; position: static !important; }
          .filter-mobile-btn { display: flex !important; }
        }
        @media (max-width: 640px) {
          main > div:first-child > div { flex-direction: column; }
        }
        @media (min-width: 641px) { .bottom-spacer { display: none; } }
        .bc-link:hover { color: var(--accent) !important; }
        .catalog-search:focus { border-color: var(--accent) !important; }
        .filter-row:hover { background: var(--bg2) !important; }
        .filter-row:hover span { color: var(--accent) !important; }
        .reset-btn:hover { color: var(--text) !important; }
        @media (max-width: 768px) { .catalog-layout { padding: 0 !important; } }
      `}</style>
    </>
  )
}
