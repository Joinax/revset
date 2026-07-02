'use client'
// src/app/(public)/ideas/IdeasClient.tsx
import { useState } from 'react'
import Link from 'next/link'

type Idea = {
  id: string; number: number; title: string; description: string
  category: string | null; voteCount: number; commentCount: number
  createdAt: string; hasVoted: boolean
}

type Props = {
  initialIdeas: Idea[]
  initialTotal: number
  pendingIdeas: { id: string; number: number; title: string }[]
  isLoggedIn: boolean
}

export default function IdeasClient({ initialIdeas, initialTotal, pendingIdeas, isLoggedIn }: Props) {
  const [ideas, setIdeas]           = useState<Idea[]>(initialIdeas)
  const [total]                     = useState(initialTotal)
  const [sort, setSort]             = useState<'popular' | 'new'>('popular')
  const [showForm, setShowForm]     = useState(false)
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [votingId, setVotingId]     = useState<string | null>(null)

  async function loadIdeas(s: 'popular' | 'new') {
    const res = await fetch(`/api/ideas?sort=${s}`)
    if (res.ok) {
      const data = await res.json()
      setIdeas(data.ideas)
    }
  }

  function handleSortChange(s: 'popular' | 'new') {
    setSort(s)
    loadIdeas(s)
  }

  async function handleVote(ideaId: string) {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setVotingId(ideaId)
    const res = await fetch(`/api/ideas/${ideaId}/vote`, { method: 'POST' })
    if (res.ok) {
      const { voted, voteCount } = await res.json()
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, hasVoted: voted, voteCount } : i))
    }
    setVotingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setSubmitting(true)
    const res = await fetch('/api/ideas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category: category || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSubmitted(true)
      setTitle(''); setDesc(''); setCategory(''); setShowForm(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-unbounded, sans-serif)', fontSize: '26px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>Идеи</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>Голосуйте за предложения или добавьте своё — лучшие реализуем</p>
        </div>
        <button
          onClick={() => isLoggedIn ? setShowForm(true) : (window.location.href = '/login')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <i className="ti ti-plus" /> Предложить идею
        </button>
      </div>

      {/* Pending banners */}
      {pendingIdeas.map(p => (
        <div key={p.id} style={{ marginBottom: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#B45309', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <i className="ti ti-clock" style={{ flexShrink: 0 }} />
          Ваша идея «{p.title}» на модерации — появится после проверки
        </div>
      ))}

      {submitted && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.25)', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-check" /> Ваша идея отправлена на модерацию — спасибо!
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', boxShadow: 'var(--shadow-rest)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Новая идея</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <i className="ti ti-x" style={{ fontSize: '18px' }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              placeholder="Заголовок (5–120 символов)"
              value={title} onChange={e => setTitle(e.target.value)} required minLength={5} maxLength={120}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
            />
            <textarea
              placeholder="Опишите идею подробнее (10–4000 символов)"
              value={description} onChange={e => setDesc(e.target.value)} required minLength={10} maxLength={4000} rows={4}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <input
              placeholder="Категория (необязательно)"
              value={category} onChange={e => setCategory(e.target.value)} maxLength={50}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Отмена
              </button>
              <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '8px 20px', fontSize: '13px', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sort tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid var(--border)' }}>
        {(['popular', 'new'] as const).map(s => (
          <button key={s} onClick={() => handleSortChange(s)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: sort === s ? 700 : 400,
            color: sort === s ? 'var(--accent)' : 'var(--muted)',
            borderBottom: sort === s ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-2px', fontFamily: 'inherit',
          }}>
            {s === 'popular' ? 'Популярные' : 'Новые'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '13px', color: 'var(--muted)' }}>{total} идей</span>
      </div>

      {/* Ideas list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ideas.map(idea => (
          <div key={idea.id} style={{
            display: 'flex', gap: '16px', padding: '16px',
            border: '1px solid var(--border)', borderRadius: '14px',
            background: 'var(--bg)', transition: 'box-shadow 0.15s',
          }} className="idea-card">
            {/* Vote box */}
            <button
              onClick={() => handleVote(idea.id)}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', width: '52px', minHeight: '64px', borderRadius: '10px',
                border: `2px solid ${idea.hasVoted ? 'var(--accent)' : 'var(--border)'}`,
                background: idea.hasVoted ? 'rgba(72,128,255,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s', gap: '2px',
              }}
              className="vote-btn"
            >
              {votingId === idea.id
                ? <i className="ti ti-loader-2" style={{ fontSize: '18px', color: 'var(--muted)' }} />
                : <i className="ti ti-chevron-up" style={{ fontSize: '18px', color: idea.hasVoted ? 'var(--accent)' : 'var(--muted)' }} />
              }
              <span style={{ fontSize: '14px', fontWeight: 700, color: idea.hasVoted ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{idea.voteCount}</span>
            </button>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/ideas/${idea.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {idea.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {idea.description}
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {idea.category && (
                  <span className="chip" style={{ fontSize: '11px' }}>{idea.category}</span>
                )}
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="ti ti-message-circle" style={{ fontSize: '13px' }} /> {idea.commentCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ideas.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '64px 0' }}>
          <i className="ti ti-bulb" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', opacity: 0.35 }} />
          Нет опубликованных идей. Будьте первым!
        </div>
      )}

      <style>{`
        .idea-card:hover { box-shadow: var(--shadow-hover); }
        .vote-btn:hover { border-color: var(--accent) !important; }
      `}</style>
    </div>
  )
}
