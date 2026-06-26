'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const PAGE_SIZE   = 12

export type PickerProduct = {
  id: string
  name: string
  price: number | null
  images: string[]
  createdAt: string
  category: { id: string; name: string } | null
}

type Props = {
  isOpen:      boolean
  onClose:     () => void
  products:    PickerProduct[]
  selectedIds: string[]
  onConfirm:   (ids: string[]) => void
}

export default function ProductPickerModal({ isOpen, onClose, products, selectedIds, onConfirm }: Props) {
  const [draftIds,   setDraftIds]   = useState<string[]>(selectedIds)
  const [search,     setSearch]     = useState('')
  const [query,      setQuery]      = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sort,       setSort]       = useState<'newest' | 'oldest' | 'price'>('newest')
  const [page,       setPage]       = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (isOpen) {
      setDraftIds(selectedIds)
      setSearch('')
      setQuery('')
      setCategoryId(null)
      setSort('newest')
      setPage(1)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setQuery(search); setPage(1) }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const p of products) {
      if (p.category) {
        const ex = map.get(p.category.id)
        if (ex) ex.count++
        else map.set(p.category.id, { ...p.category, count: 1 })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [products])

  const filtered = useMemo(() => {
    let list = products
    if (categoryId) list = list.filter(p => p.category?.id === categoryId)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    const sorted = [...list]
    if (sort === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'oldest') sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (sort === 'price')  sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    return sorted
  }, [products, categoryId, query, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedProducts = draftIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as PickerProduct[]

  function toggleProduct(id: string) {
    setDraftIds(prev =>
      prev.includes(id)   ? prev.filter(x => x !== id)
      : prev.length < 12  ? [...prev, id]
      : prev
    )
  }

  function handleCategoryClick(id: string | null) {
    setCategoryId(id)
    setPage(1)
  }

  function handleConfirm() {
    onConfirm(draftIds)
    onClose()
  }

  if (!isOpen) return null

  const sidebarBtn: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '8px 16px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px', width: '100%', maxWidth: 'min(1200px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>Выберите карточки для пака</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Выбрано:{' '}
              <span style={{ color: draftIds.length === 12 ? 'var(--danger)' : 'var(--text)', fontWeight: 600 }}>
                {draftIds.length}
              </span>{' '}/ 12
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '20px', lineHeight: 1, padding: 0 }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar — категории */}
          <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 0' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '0 16px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Категории
            </div>
            <button
              style={{ ...sidebarBtn, color: categoryId === null ? 'var(--accent)' : 'var(--text)', background: categoryId === null ? 'rgba(72,128,255,0.08)' : 'none' }}
              onClick={() => handleCategoryClick(null)}>
              <span>Все</span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{products.length}</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                style={{ ...sidebarBtn, color: categoryId === cat.id ? 'var(--accent)' : 'var(--text)', background: categoryId === cat.id ? 'rgba(72,128,255,0.08)' : 'none' }}
                onClick={() => handleCategoryClick(cat.id)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{cat.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Main */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Search + sort */}
            <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск по названию..."
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px 8px 34px', color: 'var(--text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <select
                value={sort}
                onChange={e => { setSort(e.target.value as typeof sort); setPage(1) }}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                <option value="newest">Новые</option>
                <option value="oldest">Старые</option>
                <option value="price">По цене</option>
              </select>
            </div>

            {/* Полоса выбранных */}
            {selectedProducts.length > 0 && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Добавлено в пак:</div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {selectedProducts.map(p => (
                    <div key={p.id} style={{ flexShrink: 0, width: '72px' }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg2)', border: '2px solid var(--accent)', position: 'relative' }}>
                        {p.images[0]
                          ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-3d" style={{ color: 'var(--muted)', fontSize: '20px' }} /></div>}
                        <button
                          onClick={() => setDraftIds(prev => prev.filter(x => x !== p.id))}
                          style={{ position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--danger)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <i className="ti ti-x" style={{ fontSize: '10px', color: '#fff' }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '4px', width: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Сетка карточек */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {paginated.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: '13px' }}>
                  <i className="ti ti-search" style={{ fontSize: '32px', display: 'block', marginBottom: '12px', opacity: 0.4 }} />
                  Карточки не найдены
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {paginated.map(p => {
                    const selected = draftIds.includes(p.id)
                    const disabled = !selected && draftIds.length >= 12
                    return (
                      <div
                        key={p.id}
                        onClick={() => !disabled && toggleProduct(p.id)}
                        style={{ borderRadius: '10px', overflow: 'hidden', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, background: 'var(--bg2)', transition: 'border-color 0.15s, opacity 0.15s, transform 0.15s', transform: selected ? 'none' : undefined }}>
                        {/* Превью — фиксированная высота как в каталоге */}
                        <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: 'var(--bg3)' }}>
                          {p.images[0]
                            ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-3d" style={{ fontSize: '32px', color: 'var(--muted)' }} /></div>}
                          {selected && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(72,128,255,0.12)' }} />
                          )}
                          {selected && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                              <i className="ti ti-check" style={{ fontSize: '13px', color: '#fff' }} />
                            </div>
                          )}
                        </div>
                        {/* Инфо */}
                        <div style={{ padding: '10px 12px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: selected ? 'var(--accent)' : 'var(--muted)', fontWeight: selected ? 600 : 400 }}>
                            {p.price ? `${Number(p.price).toLocaleString('ru')} ₽` : 'Бесплатно'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text)', fontSize: '13px', opacity: page === 1 ? 0.4 : 1 }}>
                  ←
                </button>
                <span style={{ fontSize: '13px', color: 'var(--muted)', minWidth: '60px', textAlign: 'center' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text)', fontSize: '13px', opacity: page === totalPages ? 0.4 : 1 }}>
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}>
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={draftIds.length < 2}
            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: draftIds.length < 2 ? 'var(--bg3)' : 'var(--accent)', color: '#fff', fontSize: '13px', fontFamily: 'var(--font-unbounded), sans-serif', fontWeight: 700, cursor: draftIds.length < 2 ? 'not-allowed' : 'pointer' }}>
            {draftIds.length === 0
              ? 'Выберите карточки'
              : `Добавить ${draftIds.length} ${draftIds.length === 1 ? 'карточку' : draftIds.length < 5 ? 'карточки' : 'карточек'}`}
          </button>
        </div>

      </div>
    </div>
  )
}
