'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const avatarSrc   = (img: string) => img.startsWith('http') ? img : `${S3_ENDPOINT}/${S3_BUCKET}/${img}`

type User = {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  createdAt: string
  isVerified: boolean
  totalSales: number
  totalRevenue: number
  ordersCount: number
  productsCount: number
  isBanned: boolean
}

type Props = {
  users: User[]
  total: number
  currentPage: number
  perPage: number
  currentRole: string
  currentQ: string
}

const ROLES = [
  { value: 'all',    label: 'Все' },
  { value: 'user',   label: 'Покупатели' },
  { value: 'author', label: 'Авторы' },
  { value: 'admin',  label: 'Админы' },
  { value: 'banned', label: 'Заблокированные' },
]

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  user:   { label: 'Покупатель', color: '#4379EE', bg: 'rgba(67,121,238,0.1)' },
  author: { label: 'Автор',      color: '#00B69B', bg: 'rgba(0,182,155,0.1)'  },
  admin:  { label: 'Админ',      color: '#EF3826', bg: 'rgba(239,56,38,0.1)'  },
}

export default function AdminUsersClient({ users, total, currentPage, perPage, currentRole, currentQ }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ)

  const totalPages = Math.ceil(total / perPage)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { role: currentRole, q: currentQ, page: '1', ...updates }
    if (merged.role && merged.role !== 'all') params.set('role', merged.role)
    if (merged.q) params.set('q', merged.q)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    startTransition(() => router.push(params.toString() ? `${pathname}?${params}` : pathname))
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatMoney = (n: number) =>
    n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .users-row:hover { background: rgba(72,128,255,0.04) !important; }
        .users-row { transition: background 0.15s; }
        .role-tab { transition: all 0.15s; cursor: pointer; border: none; }
        .role-tab:hover { color: var(--admin-accent) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Пользователи</h1>
          <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>
            Всего: {total.toLocaleString('ru-RU')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        {/* Role tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '10px', padding: '4px' }}>
          {ROLES.map(r => (
            <button
              key={r.value}
              className="role-tab"
              onClick={() => updateParams({ role: r.value })}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: currentRole === r.value ? 'var(--admin-bg)' : 'transparent',
                color: currentRole === r.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
                boxShadow: currentRole === r.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
          borderRadius: '10px', padding: '8px 12px', flex: 1, maxWidth: '320px',
        }}>
          <i className="ti ti-search" style={{ fontSize: '14px', color: 'var(--admin-muted)' }} />
          <input
            type="text"
            value={search}
            placeholder="Поиск по имени или email..."
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
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: '14px',
        overflow: 'hidden',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr',
          padding: '12px 20px',
          borderBottom: '1px solid var(--admin-border)',
          background: 'var(--admin-bg2)',
        }}>
          {['Пользователь', 'Email', 'Роль', 'Статус', 'Заказы', 'Семейства', 'Дата'].map(h => (
            <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {users.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
            Пользователи не найдены
          </div>
        ) : (
          users.map(user => {
            const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: '#848484', bg: 'rgba(132,132,132,0.1)' }
            return (
              <Link key={user.id} href={`/admin/users/${user.id}`} className="users-row" style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr',
                padding: '14px 20px',
                borderBottom: '1px solid var(--admin-border)',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
              }}>
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {user.image ? (
                    <img src={avatarSrc(user.image)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(72,128,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name}
                      {user.isVerified && (
                        <i className="ti ti-rosette-discount-check" style={{ color: 'var(--admin-accent)', fontSize: '14px', marginLeft: '4px' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: '13px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>

                {/* Role */}
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: roleInfo.color, background: roleInfo.bg,
                    padding: '3px 10px', borderRadius: '20px',
                  }}>
                    {roleInfo.label}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    padding: '3px 10px', borderRadius: '20px',
                    color:       user.isBanned ? '#EF3826' : '#00B69B',
                    background:  user.isBanned ? 'rgba(239,56,38,0.1)' : 'rgba(0,182,155,0.1)',
                  }}>
                    {user.isBanned ? 'Заблокирован' : 'Активен'}
                  </span>
                </div>

                {/* Orders */}
                <div style={{ fontSize: '13px', color: 'var(--admin-text)', fontWeight: 500 }}>
                  {user.ordersCount}
                </div>

                {/* Products */}
                <div style={{ fontSize: '13px', color: 'var(--admin-text)', fontWeight: 500 }}>
                  {user.productsCount > 0 ? user.productsCount : '—'}
                </div>

                {/* Date */}
                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                  {formatDate(user.createdAt)}
                </div>
              </Link>
            )
          })
        )}

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
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => updateParams({ page: String(p) })}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                    border: `1px solid ${p === currentPage ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                    background: p === currentPage ? 'var(--admin-accent)' : 'var(--admin-bg)',
                    color: p === currentPage ? '#fff' : 'var(--admin-text)',
                    fontWeight: p === currentPage ? 600 : 400,
                  }}>
                  {p}
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
