'use client'
// src/app/admin/ideas/AdminIdeasClient.tsx
import { useState } from 'react'
import Link from 'next/link'

type Idea = {
  id: string; number: number; title: string; description: string
  category: string | null; moderationStatus: string; moderationComment: string | null
  status: string; voteCount: number; commentCount: number; createdAt: string
  author: { name: string | null; email: string }; userId: string
}

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: 'На рассмотрении', PLANNED: 'Запланировано',
  IN_PROGRESS: 'В работе', DONE: 'Реализовано', DECLINED: 'Отклонено',
}
const STATUS_OPTIONS = Object.entries(STATUS_LABELS)

export default function AdminIdeasClient({ initialIdeas }: { initialIdeas: Idea[] }) {
  const [tab, setTab]           = useState<'pending' | 'all'>('pending')
  // Separate state: pending list (mutated by approve/reject) and all-ideas list
  const [pendingIdeas, setPendingIdeas] = useState<Idea[]>(initialIdeas.filter(i => i.moderationStatus === 'PENDING'))
  const [allIdeas, setAllIdeas]         = useState<Idea[]>([])
  const [allLoaded, setAllLoaded]       = useState(false)
  const [allLoading, setAllLoading]     = useState(false)
  const [rejectId, setRejectId]         = useState<string | null>(null)
  const [rejectText, setRejectText]     = useState('')
  const [loading, setLoading]           = useState<string | null>(null)

  async function loadAll() {
    if (allLoaded) return
    setAllLoading(true)
    const res = await fetch('/api/admin/ideas?status=APPROVED')
    if (res.ok) {
      setAllIdeas(await res.json())
      setAllLoaded(true)
    }
    setAllLoading(false)
  }

  function handleTabChange(t: 'pending' | 'all') {
    setTab(t)
    if (t === 'all') loadAll()
  }

  async function handleAction(id: string, action: 'approve' | 'reject', comment?: string) {
    setLoading(id)
    await fetch('/api/admin/ideas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, moderationComment: comment }),
    })
    setPendingIdeas(prev => prev.filter(i => i.id !== id))
    // Also reload all-ideas if already loaded so the newly approved idea appears
    if (action === 'approve' && allLoaded) {
      const res = await fetch('/api/admin/ideas?status=APPROVED')
      if (res.ok) setAllIdeas(await res.json())
    }
    setLoading(null)
    setRejectId(null)
    setRejectText('')
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch('/api/admin/ideas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'set_status', status }),
    })
    setAllIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const displayed = tab === 'pending' ? pendingIdeas : allIdeas

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '24px' }}>
        Идеи пользователей
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--admin-border)' }}>
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => handleTabChange(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t ? 700 : 400,
            color: tab === t ? 'var(--admin-accent)' : 'var(--admin-muted)',
            borderBottom: tab === t ? '2px solid var(--admin-accent)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>
            {t === 'pending' ? `На проверке (${pendingIdeas.length})` : 'Все идеи'}
          </button>
        ))}
      </div>

      {allLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: '48px' }}>
          <i className="ti ti-loader-2" style={{ fontSize: '24px', opacity: 0.5 }} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: '48px' }}>
          {tab === 'pending' ? 'Нет идей для проверки' : 'Нет одобренных идей'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayed.map(idea => (
            <div key={idea.id} style={{
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderRadius: 'var(--admin-radius)', padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>#{idea.number}</span>
                    {idea.category && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--admin-bg2)', color: 'var(--admin-muted)' }}>
                        {idea.category}
                      </span>
                    )}
                    <Link href={`/admin/ideas/${idea.id}`} style={{ fontSize: '11px', color: 'var(--admin-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      Открыть <i className="ti ti-arrow-right" style={{ fontSize: '10px' }} />
                    </Link>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '4px' }}>{idea.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {idea.description}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                    {idea.author.name ?? idea.author.email} · <i className="ti ti-thumb-up" /> {idea.voteCount} · <i className="ti ti-message-circle" /> {idea.commentCount}
                  </div>
                </div>

                {idea.moderationStatus === 'PENDING' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleAction(idea.id, 'approve')}
                      disabled={loading === idea.id}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--admin-success)', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                    >
                      <i className="ti ti-check" /> Одобрить
                    </button>
                    <button
                      onClick={() => setRejectId(rejectId === idea.id ? null : idea.id)}
                      disabled={loading === idea.id}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--admin-danger)', cursor: 'pointer', background: 'transparent', color: 'var(--admin-danger)', fontSize: '13px', fontWeight: 600 }}
                    >
                      <i className="ti ti-x" /> Отклонить
                    </button>
                  </div>
                ) : (
                  <select
                    value={idea.status}
                    onChange={e => handleStatusChange(idea.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: '12px' }}
                  >
                    {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
              </div>

              {rejectId === idea.id && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <input
                    placeholder="Причина отклонения (необязательно)"
                    value={rejectText}
                    onChange={e => setRejectText(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => handleAction(idea.id, 'reject', rejectText)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--admin-danger)', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                  >
                    Подтвердить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
