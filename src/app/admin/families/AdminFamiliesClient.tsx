'use client'
import Link from 'next/link'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'

type Product = {
  id: string
  name: string
  authorName: string
  categoryId: string
  categoryName: string
  price: number | null
  isPublished: boolean
  isNew: boolean
  downloads: number
  reviewCount: number
  salesCount: number
  createdAt: string
  emoji: string
}

type Category = { id: string; name: string }

type Props = {
  products: Product[]
  categories: Category[]
  total: number
  currentPage: number
  perPage: number
  currentStatus: string
  currentCategory: string
  currentQ: string
}

const STATUSES = [
  { value: 'all',         label: 'Все' },
  { value: 'published',   label: 'Опубликованные' },
  { value: 'unpublished', label: 'На модерации' },
]

export default function AdminFamiliesClient({
  products, categories, total, currentPage, perPage,
  currentStatus, currentCategory, currentQ,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ)

  const totalPages = Math.ceil(total / perPage)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { status: currentStatus, category: currentCategory, q: currentQ, page: '1', ...updates }
    if (merged.status   && merged.status   !== 'all') params.set('status',   merged.status)
    if (merged.category && merged.category !== 'all') params.set('category', merged.category)
    if (merged.q)    params.set('q',    merged.q)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    startTransition(() => router.push(params.toString() ? `${pathname}?${params}` : pathname))
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatMoney = (n: number | null) =>
    n == null ? 'Бесплатно' : n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .families-row:hover { background: rgba(72,128,255,0.04) !important; }
        .families-row { transition: background 0.15s; }
        .role-tab { transition: all 0.15s; cursor: pointer; border: none; }
        .role-tab:hover { color: var(--admin-accent) !important; }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Семейства</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>Всего: {total.toLocaleString('ru-RU')}</p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '10px', padding: '4px' }}>
          {STATUSES.map(s => (
            <button key={s.value} className="role-tab"
              onClick={() => updateParams({ status: s.value })}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: currentStatus === s.value ? 'var(--admin-bg)' : 'transparent',
                color: currentStatus === s.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
                boxShadow: currentStatus === s.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Category select */}
        <select
          value={currentCategory}
          onChange={e => updateParams({ category: e.target.value })}
          style={{
            padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
            border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
            color: 'var(--admin-text)', outline: 'none', cursor: 'pointer',
          }}>
          <option value="all">Все категории</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
          borderRadius: '10px', padding: '8px 12px', flex: 1, maxWidth: '320px',
        }}>
          <i className="ti ti-search" style={{ fontSize: '14px', color: 'var(--admin-muted)' }} />
          <input
            type="text" value={search}
            placeholder="Поиск по названию или автору..."
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateParams({ q: search })}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--admin-text)', width: '100%' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); updateParams({ q: '' }) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-muted)', padding: 0 }}>
              <i className="ti ti-x" style={{ fontSize: '14px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', overflow: 'hidden',
        opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 1fr 1fr',
          padding: '12px 20px', borderBottom: '1px solid var(--admin-border)',
          background: 'var(--admin-bg2)',
        }}>
          {['Семейство', 'Автор', 'Категория', 'Цена', 'Статус', 'Продажи', 'Дата'].map(h => (
            <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {products.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
            Семейства не найдены
          </div>
        ) : products.map(p => (
          <Link key={p.id} href={`/admin/families/${p.id}`} className="families-row" style={{
            display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 1fr 1fr',
            padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', alignItems: 'center',
            textDecoration: 'none', color: 'inherit',
          }}>
            {/* Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--admin-bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {p.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--admin-muted)' }}>
                  {p.downloads} скачиваний · {p.reviewCount} отзывов
                </div>
              </div>
            </div>

            {/* Author */}
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.authorName}
            </div>

            {/* Category */}
            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{p.categoryName}</div>

            {/* Price */}
            <div style={{ fontSize: '13px', fontWeight: 600, color: p.price ? 'var(--admin-text)' : 'var(--admin-success)' }}>
              {formatMoney(p.price)}
            </div>

            {/* Status */}
            <div>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                color:       p.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)',
                background:  p.isPublished ? 'rgba(0,182,155,0.1)' : 'rgba(255,167,86,0.1)',
              }}>
                {p.isPublished ? 'Опубликовано' : 'На модерации'}
              </span>
            </div>

            {/* Sales */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text)' }}>
              {p.salesCount}
            </div>

            {/* Date */}
            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(p.createdAt)}</div>
          </Link>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
              {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, total)} из {total}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {currentPage > 1 && (
                <button onClick={() => updateParams({ page: String(currentPage - 1) })}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                  <i className="ti ti-chevron-left" />
                </button>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pg => (
                <button key={pg} onClick={() => updateParams({ page: String(pg) })}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                    border: `1px solid ${pg === currentPage ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                    background: pg === currentPage ? 'var(--admin-accent)' : 'var(--admin-bg)',
                    color: pg === currentPage ? '#fff' : 'var(--admin-text)',
                    fontWeight: pg === currentPage ? 600 : 400,
                  }}>
                  {pg}
                </button>
              ))}
              {currentPage < totalPages && (
                <button onClick={() => updateParams({ page: String(currentPage + 1) })}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                  <i className="ti ti-chevron-right" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
