'use client'

// src/app/admin/support/AdminSupportClient.tsx
import { useState } from 'react'
import Link from 'next/link'
import { TICKET_CATEGORIES, getCategoryLabel } from '@/lib/ticket-categories'

type TicketItem = {
  id: string; number: number; subject: string; category: string
  priority: string; status: string; assignedTo: string | null
  updatedAt: string; createdAt: string; messageCount: number
}

type TabId = 'unassigned' | 'mine' | 'all'

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: 'var(--admin-danger)',
  HIGH:   '#F5883C',
  MEDIUM: 'var(--admin-accent)',
  LOW:    '#B9B9C2',
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Срочно',
  HIGH:   'Высокий',
  MEDIUM: 'Средний',
  LOW:    'Низкий',
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  AWAITING_SUPPORT: { label: 'Ждёт поддержки',    color: 'var(--admin-muted)', bg: 'rgba(0,0,0,0.06)'         },
  AWAITING_USER:    { label: 'Ждёт пользователя', color: '#F59E0B',            bg: 'rgba(245,158,11,0.1)'     },
  CLOSED:           { label: 'Закрыт',             color: 'var(--admin-muted)', bg: 'rgba(0,0,0,0.06)'         },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч`
  const d = Math.floor(h / 24)
  return `${d} д`
}

function TicketRow({ ticket }: { ticket: TicketItem }) {
  const border  = PRIORITY_BORDER[ticket.priority] ?? '#B9B9C2'
  const st      = STATUS_LABELS[ticket.status] ?? STATUS_LABELS['AWAITING_SUPPORT']
  const priLabel = PRIORITY_LABELS[ticket.priority] ?? ticket.priority

  return (
    <Link
      href={`/admin/support/${ticket.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', textDecoration: 'none',
        borderBottom: '1px solid var(--admin-border)',
        borderLeft: `4px solid ${border}`,
        background: 'var(--admin-bg)',
        transition: 'background 0.15s',
      }}
      className="support-row"
    >
      {/* Priority dot */}
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: border, flexShrink: 0 }} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
          {ticket.subject}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
          #{ticket.number} · {getCategoryLabel(ticket.category)} · {priLabel}
        </div>
      </div>

      {/* Status + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', color: st.color, background: st.bg }}>
          {st.label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--admin-muted)' }}>{relativeTime(ticket.updatedAt)}</span>
      </div>

      <i className="ti ti-chevron-right" style={{ fontSize: '15px', color: 'var(--admin-muted)', flexShrink: 0 }} />
    </Link>
  )
}

export default function AdminSupportClient({
  agentId,
  initialUnassigned,
  initialMine,
}: {
  agentId: string
  initialUnassigned: TicketItem[]
  initialMine: TicketItem[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('unassigned')
  const [search,    setSearch]    = useState('')
  const [allTickets, setAllTickets] = useState<TicketItem[]>([])
  const [allLoading, setAllLoading] = useState(false)

  async function loadAll() {
    setAllLoading(true)
    try {
      const res = await fetch('/api/support?admin=1')
      if (res.ok) setAllTickets(await res.json())
    } finally {
      setAllLoading(false)
    }
  }

  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
    if (tab === 'all' && allTickets.length === 0) loadAll()
  }

  const source = activeTab === 'unassigned' ? initialUnassigned
               : activeTab === 'mine'       ? initialMine
               :                              allTickets

  const filtered = source.filter(t =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase())
  )

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'unassigned', label: 'Неназначенные', count: initialUnassigned.length },
    { id: 'mine',       label: 'Мои',           count: initialMine.length },
    { id: 'all',        label: 'Все',           count: 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text)', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
            Обращения
          </h1>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--admin-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по теме..."
              style={{ padding: '8px 12px 8px 36px', border: '1px solid var(--admin-border)', borderRadius: '8px', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: '13px', outline: 'none', width: '240px', fontFamily: 'inherit' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-muted)', padding: '2px', lineHeight: 1 }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--admin-accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--admin-accent)' : 'var(--admin-muted)',
                fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  minWidth: '18px', height: '18px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '9px', padding: '0 5px',
                  background: activeTab === tab.id ? 'var(--admin-accent)' : 'var(--admin-border)',
                  color: activeTab === tab.id ? '#fff' : 'var(--admin-muted)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ background: 'var(--admin-bg-page, var(--admin-bg2))', minHeight: '400px' }}>
        {allLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--admin-muted)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: '24px', opacity: 0.5, display: 'block', marginBottom: '8px' }} />
            Загрузка...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--admin-muted)' }}>
            <i className="ti ti-inbox" style={{ fontSize: '36px', opacity: 0.3, display: 'block', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px' }}>{search ? 'Ничего не найдено' : 'Обращений нет'}</div>
          </div>
        ) : (
          <div>
            {filtered.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      <style>{`
        .support-row:hover { background: var(--admin-bg2) !important; }
      `}</style>
    </div>
  )
}
