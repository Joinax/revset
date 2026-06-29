'use client'
import Link from 'next/link'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const avatarSrc   = (img: string) => img.startsWith('http') ? img : `${S3_ENDPOINT}/${S3_BUCKET}/${img}`

type Order = {
  id: string
  userName: string
  userEmail: string
  userImage: string | null
  status: string
  totalAmount: number
  itemCount: number
  itemNames: string[]
  createdAt: string
}

type Props = {
  orders: Order[]
  total: number
  currentPage: number
  perPage: number
  currentStatus: string
  currentQ: string
  totalRevenue: number
  totalPaid: number
  currentUserId?: string
  currentUserName?: string   // имя пользователя для баннера
}

const STATUSES = [
  { value: 'all',       label: 'Все'       },
  { value: 'PAID',      label: 'Оплачено'  },
  { value: 'PENDING',   label: 'Ожидание'  },
  { value: 'CANCELLED', label: 'Отменено'  },
  { value: 'REFUNDED',  label: 'Возврат'   },
]

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PAID:      { label: 'Оплачено',  color: '#00B69B', bg: 'rgba(0,182,155,0.1)'   },
  PENDING:   { label: 'Ожидание',  color: '#FFA756', bg: 'rgba(255,167,86,0.1)'  },
  CANCELLED: { label: 'Отменено',  color: '#EF3826', bg: 'rgba(239,56,38,0.1)'   },
  REFUNDED:  { label: 'Возврат',   color: '#848484', bg: 'rgba(132,132,132,0.1)' },
}

export default function AdminTransactionsClient({
  orders, total, currentPage, perPage,
  currentStatus, currentQ, totalRevenue, totalPaid,
  currentUserId = '', currentUserName = '',
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ)

  const totalPages = Math.ceil(total / perPage)
  const isFiltered = !!currentUserId

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { status: currentStatus, q: currentQ, page: '1', userId: currentUserId, ...updates }
    if (merged.status && merged.status !== 'all') params.set('status', merged.status)
    if (merged.q) params.set('q', merged.q)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    if (merged.userId) params.set('userId', merged.userId)
    startTransition(() => router.push(params.toString() ? `${pathname}?${params}` : pathname))
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatMoney = (n: number) =>
    n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .tx-row:hover { background: rgba(72,128,255,0.04) !important; }
        .tx-row { transition: background 0.15s; }
        .role-tab { transition: all 0.15s; cursor: pointer; border: none; }
      `}</style>

      {/* Кнопка назад — показывается только при фильтрации по пользователю */}
      {isFiltered && (
        <div>
          <Link
            href={`/admin/users/${currentUserId}`}
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            Транзакции
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px', marginBottom: 0 }}>
            {isFiltered && currentUserName
              ? `Заказы пользователя: ${currentUserName}`
              : 'Все заказы платформы'
            }
          </p>
        </div>

        {/* Бейдж фильтра — кнопка сброса */}
        {isFiltered && (
          <Link
            href="/admin/transactions"
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

      {/* Баннер контекста — показывается когда фильтруем по пользователю */}
      {isFiltered && currentUserName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(72,128,255,0.06)',
          border: '1px solid rgba(72,128,255,0.2)',
        }}>
          <i className="ti ti-filter" style={{ fontSize: '16px', color: 'var(--admin-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
            Показаны заказы пользователя{' '}
            <strong style={{ color: 'var(--admin-accent)' }}>{currentUserName}</strong>
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Всего заказов',    value: total.toLocaleString('ru-RU'),          icon: 'ti-receipt' },
          { label: 'Оплаченных',       value: totalPaid.toLocaleString('ru-RU'),       icon: 'ti-check'   },
          { label: 'Общая выручка',    value: formatMoney(totalRevenue),               icon: 'ti-coin'    },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
            borderRadius: '14px', padding: '20px',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <span style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(72,128,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: '20px', color: 'var(--admin-accent)' }} />
            </span>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
          borderRadius: '10px', padding: '8px 12px', flex: 1, maxWidth: '320px',
        }}>
          <i className="ti ti-search" style={{ fontSize: '14px', color: 'var(--admin-muted)' }} />
          <input
            type="text" value={search}
            placeholder="Поиск по покупателю..."
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
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr',
          padding: '12px 20px', borderBottom: '1px solid var(--admin-border)',
          background: 'var(--admin-bg2)',
        }}>
          {['Покупатель', 'Товары', 'Сумма', 'Статус', 'Дата'].map(h => (
            <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
            Заказы не найдены
          </div>
        ) : orders.map(order => {
          const st = STATUS_STYLE[order.status] ?? { label: order.status, color: '#848484', bg: 'rgba(132,132,132,0.1)' }
          return (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="tx-row" style={{
              display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr',
              padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', alignItems: 'center',
              textDecoration: 'none', color: 'inherit',
            }}>
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {order.userImage ? (
                  <img src={avatarSrc(order.userImage)} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'rgba(72,128,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                      {order.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.userName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.userEmail}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.itemNames[0]}{order.itemCount > 1 ? ` +${order.itemCount - 1}` : ''}
              </div>

              {/* Amount */}
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)' }}>
                {formatMoney(order.totalAmount)}
              </div>

              {/* Status */}
              <div>
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                  color: st.color, background: st.bg,
                }}>
                  {st.label}
                </span>
              </div>

              {/* Date */}
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                {formatDate(order.createdAt)}
              </div>
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
