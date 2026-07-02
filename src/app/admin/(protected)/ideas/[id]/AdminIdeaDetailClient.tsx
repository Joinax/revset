'use client'
// src/app/admin/ideas/[id]/AdminIdeaDetailClient.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Idea = {
  id: string; number: number; title: string; description: string
  category: string | null; status: string; moderationStatus: string
  moderationComment: string | null; voteCount: number; createdAt: string
  author: { name: string | null; email: string }
}

type Comment = {
  id: string; text: string; createdAt: string
  moderationStatus: string; author: { name: string | null; email: string }
}

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: 'На рассмотрении', PLANNED: 'Запланировано',
  IN_PROGRESS:  'В работе',        DONE:    'Реализовано',
  DECLINED:     'Отклонено',
}
const STATUS_OPTIONS = Object.entries(STATUS_LABELS)

const MOD_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'На проверке', color: '#D97706', bg: 'rgba(245,158,11,0.1)'  },
  APPROVED: { label: 'Одобрено',    color: 'var(--admin-success)', bg: 'rgba(29,158,117,0.1)' },
  REJECTED: { label: 'Отклонено',   color: 'var(--admin-danger)',  bg: 'rgba(226,75,74,0.1)'  },
}

export default function AdminIdeaDetailClient({
  idea: initial,
  comments,
}: {
  idea: Idea
  comments: Comment[]
}) {
  const router                        = useRouter()
  const [idea, setIdea]               = useState(initial)
  const [rejectText, setRejectText]   = useState('')
  const [showReject, setShowReject]   = useState(false)
  const [loading, setLoading]         = useState(false)

  async function handleAction(action: 'approve' | 'reject', comment?: string) {
    setLoading(true)
    const res = await fetch('/api/admin/ideas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idea.id, action, moderationComment: comment }),
    })
    if (res.ok) {
      setIdea(prev => ({
        ...prev,
        moderationStatus:  action === 'approve' ? 'APPROVED' : 'REJECTED',
        moderationComment: comment ?? prev.moderationComment,
      }))
      setShowReject(false)
    }
    setLoading(false)
  }

  async function handleStatusChange(status: string) {
    await fetch('/api/admin/ideas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idea.id, action: 'set_status', status }),
    })
    setIdea(prev => ({ ...prev, status }))
  }

  const mod = MOD_BADGE[idea.moderationStatus] ?? MOD_BADGE['PENDING']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>#{idea.number}</span>
            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: mod.bg, color: mod.color, fontWeight: 600 }}>
              {mod.label}
            </span>
            {idea.category && (
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--admin-bg2)', color: 'var(--admin-muted)' }}>
                {idea.category}
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            {idea.title}
          </h1>
        </div>

        {/* Status selector (only for approved ideas) */}
        {idea.moderationStatus === 'APPROVED' && (
          <select
            value={idea.status}
            onChange={e => handleStatusChange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: '13px', flexShrink: 0 }}
          >
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </div>

      {/* Body */}
      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius)', padding: '20px', fontSize: '15px', color: 'var(--admin-text)', lineHeight: 1.7 }}>
        {idea.description}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--admin-muted)' }}>
        <span><i className="ti ti-user" /> {idea.author.name ?? idea.author.email}</span>
        <span><i className="ti ti-thumb-up" /> {idea.voteCount} голосов</span>
        <span><i className="ti ti-calendar" /> {new Date(idea.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Moderation actions */}
      {idea.moderationStatus === 'PENDING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Модерация</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--admin-success)', color: '#fff', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              <i className="ti ti-check" /> Одобрить
            </button>
            <button
              onClick={() => setShowReject(v => !v)}
              disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--admin-danger)', cursor: 'pointer', background: 'transparent', color: 'var(--admin-danger)', fontSize: '13px', fontWeight: 600 }}
            >
              <i className="ti ti-x" /> Отклонить
            </button>
          </div>
          {showReject && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="Причина отклонения (необязательно)"
                value={rejectText}
                onChange={e => setRejectText(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)', color: 'var(--admin-text)', fontSize: '13px' }}
              />
              <button
                onClick={() => handleAction('reject', rejectText)}
                disabled={loading}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--admin-danger)', color: '#fff', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
              >
                Подтвердить
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rejection comment */}
      {idea.moderationStatus === 'REJECTED' && idea.moderationComment && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(226,75,74,0.06)', border: '1px solid rgba(226,75,74,0.2)', fontSize: '13px', color: 'var(--admin-danger)' }}>
          <strong>Причина отклонения:</strong> {idea.moderationComment}
        </div>
      )}

      {/* Comments */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '12px' }}>
          Комментарии ({comments.length})
        </div>
        {comments.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>Нет комментариев</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <div style={{ fontSize: '13px', color: 'var(--admin-text)', marginBottom: '6px', lineHeight: 1.5 }}>{c.text}</div>
                <div style={{ fontSize: '11px', color: 'var(--admin-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>{c.author.name ?? c.author.email}</span>
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
                  {c.moderationStatus !== 'APPROVED' && (
                    <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.12)', color: '#D97706', fontWeight: 600, fontSize: '10px' }}>
                      {c.moderationStatus === 'PENDING' ? 'На проверке' : 'Отклонён'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
