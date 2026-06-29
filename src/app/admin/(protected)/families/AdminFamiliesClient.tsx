'use client'
import Link from 'next/link'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'

type Product = {
  id: string
  name: string
  authorName: string
  categoryId: string
  categoryName: string
  price: number | null
  isPublished: boolean
  moderationStatus: 'DRAFT' | 'PENDING_SCAN' | 'PENDING' | 'BUILDING_BUNDLE' | 'BUNDLE_FAILED' | 'APPROVED' | 'REJECTED'
  isNew: boolean
  downloads: number
  reviewCount: number
  salesCount: number
  createdAt: string
  emoji: string
  images: string[]
}

type Category = { id: string; name: string }

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Props = {
  products: Product[]
  categories: Category[]
  total: number
  currentPage: number
  perPage: number
  currentStatus: string
  currentCategory: string
  currentQ: string
  currentAuthorId?: string
  currentAuthorName?: string  // имя автора для баннера
}

const STATUSES = [
  { value: 'all',            label: 'Все' },
  { value: 'DRAFT',          label: 'Черновики' },
  { value: 'PENDING_SCAN',   label: 'Проверка' },
  { value: 'PENDING',        label: 'На модерации' },
  { value: 'BUILDING_BUNDLE', label: 'Архив формируется' },
  { value: 'BUNDLE_FAILED',  label: 'Ошибка архива' },
  { value: 'APPROVED',       label: 'Опубликованные' },
  { value: 'REJECTED',       label: 'Отклонённые' },
]

const MODERATION_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_SCAN:    { label: 'Проверка безопасности', color: 'var(--admin-accent)',  bg: 'rgba(72,128,255,0.1)' },
  DRAFT:           { label: 'Черновик',              color: 'var(--admin-muted)',   bg: 'var(--admin-bg2)' },
  PENDING:         { label: 'На модерации',           color: 'var(--admin-warning)', bg: 'rgba(255,167,86,0.1)' },
  BUILDING_BUNDLE: { label: 'Архив формируется',      color: 'var(--admin-accent)',  bg: 'rgba(72,128,255,0.1)' },
  BUNDLE_FAILED:   { label: 'Ошибка архива',          color: 'var(--admin-danger)',  bg: 'rgba(239,56,38,0.1)' },
  APPROVED:        { label: 'Опубликовано',           color: 'var(--admin-success)', bg: 'rgba(0,182,155,0.1)' },
  REJECTED:        { label: 'Отклонено',              color: 'var(--admin-danger)',  bg: 'rgba(239,56,38,0.1)' },
}

export default function AdminFamiliesClient({
  products, categories, total, currentPage, perPage,
  currentStatus, currentCategory, currentQ,
  currentAuthorId = '', currentAuthorName = '',
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ)

  useEffect(() => {
    function onFocus() { router.refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  // Лёгкий polling — авторы могут отправить новую модель на модерацию в любой момент
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20000)
    return () => clearInterval(interval)
  }, [router])

  const totalPages = Math.ceil(total / perPage)
  const isFiltered = !!currentAuthorId

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { status: currentStatus, category: currentCategory, q: currentQ, page: '1', authorId: currentAuthorId, ...updates }
    if (merged.status   && merged.status   !== 'all') params.set('status',   merged.status)
    if (merged.category && merged.category !== 'all') params.set('category', merged.category)
    if (merged.q)    params.set('q',    merged.q)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    if (merged.authorId) params.set('authorId', merged.authorId)
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

      {/* Кнопка назад — показывается только при фильтрации по автору */}
      {isFiltered && (
        <div>
          <Link
            href={`/admin/users/${currentAuthorId}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: 'var(--admin-muted)', textDecoration: 'none',
            }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
            Назад к профилю
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Семейства</h1>
          <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px', marginBottom: 0 }}>
            {isFiltered && currentAuthorName
              ? `Семейства автора: ${currentAuthorName}`
              : `Всего: ${total.toLocaleString('ru-RU')}`
            }
          </p>
        </div>

        {/* Кнопка сброса фильтра */}
        {isFiltered && (
          <Link
            href="/admin/families"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '10px',
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-bg)',
              fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)',
              textDecoration: 'none', flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: '13px' }} />
            Снять фильтр
          </Link>
        )}
      </div>

      {/* Баннер контекста */}
      {isFiltered && currentAuthorName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(72,128,255,0.06)',
          border: '1px solid rgba(72,128,255,0.2)',
        }}>
          <i className="ti ti-filter" style={{ fontSize: '16px', color: 'var(--admin-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
            Показаны семейства автора{' '}
            <strong style={{ color: 'var(--admin-accent)' }}>{currentAuthorName}</strong>
          </span>
        </div>
      )}

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
        ) : products.map(p => {
          const statusInfo = MODERATION_COLORS[p.moderationStatus] ?? MODERATION_COLORS.DRAFT
          const isBlocked = p.moderationStatus === 'PENDING_SCAN'
          const rowStyle = {
            display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 1fr 1fr',
            padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', alignItems: 'center',
            color: 'inherit',
          }
          return isBlocked ? (
          <div key={p.id} style={{ ...rowStyle, opacity: 0.65, cursor: 'default' }}>
            {/* Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--admin-bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0, overflow: 'hidden',
              }}>
                {p.images.length > 0
                  ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.emoji
                }
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
                color:      statusInfo.color,
                background: statusInfo.bg,
              }}>
                {statusInfo.label}
              </span>
            </div>

            {/* Sales */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text)' }}>
              {p.salesCount}
            </div>

            {/* Date */}
            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(p.createdAt)}</div>
          </div>
          ) : (
          <Link key={p.id} href={`/admin/families/${p.id}`} className="families-row" style={{
            ...rowStyle, textDecoration: 'none',
          }}>
            {/* Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--admin-bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0, overflow: 'hidden',
              }}>
                {p.images.length > 0
                  ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.emoji
                }
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
                color:      statusInfo.color,
                background: statusInfo.bg,
              }}>
                {statusInfo.label}
              </span>
            </div>

            {/* Sales */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text)' }}>
              {p.salesCount}
            </div>

            {/* Date */}
            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(p.createdAt)}</div>
          </Link>
          )
        })}

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
