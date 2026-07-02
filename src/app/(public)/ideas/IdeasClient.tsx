'use client'
// src/app/(public)/ideas/IdeasClient.tsx
import { useState, useEffect } from 'react'
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
  const [ideas, setIdeas]       = useState<Idea[]>(initialIdeas)
  const [total]                 = useState(initialTotal)
  const [sort, setSort]         = useState<'popular' | 'new'>('popular')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [category, setCategory] = useState('')
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 700, margin: '0 0 6px' }}>Идеи</h1>
          <p style={{ color: '#848484', fontSize: '14px', margin: 0 }}>Голосуйте за предложения или добавьте своё — лучшие реализуем</p>
        </div>
        <button
          onClick={() => isLoggedIn ? setShowForm(true) : (window.location.href = '/login')}
          style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#4880FF', color: '#fff', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="ti ti-plus" /> Предложить идею
        </button>
      </div>

      {/* Pending banner */}
      {pendingIdeas.map(p => (
        <div key={p.id} style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,167,86,0.12)', border: '1px solid rgba(255,167,86,0.3)', color: '#b35c00', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <i className="ti ti-clock" />
          Ваша идея «{p.title}» на модерации — появится после проверки
        </div>
      ))}

      {submitted && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,182,155,0.1)', border: '1px solid rgba(0,182,155,0.3)', color: '#007a66', fontSize: '14px' }}>
          <i className="ti ti-check" /> Ваша идея отправлена на модерацию
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '14px', border: '1px solid #E0E0E0', background: '#fff' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Новая идея</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              placeholder="Заголовок (5–120 символов)"
              value={title} onChange={e => setTitle(e.target.value)} required minLength={5} maxLength={120}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '14px' }}
            />
            <textarea
              placeholder="Опишите идею подробнее (10–4000 символов)"
              value={description} onChange={e => setDesc(e.target.value)} required minLength={10} maxLength={4000} rows={4}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '14px', resize: 'vertical' }}
            />
            <input
              placeholder="Категория (необязательно)"
              value={category} onChange={e => setCategory(e.target.value)} maxLength={50}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E0E0E0', background: 'none', cursor: 'pointer', fontSize: '13px' }}>
                Отмена
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#4880FF', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sort tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #E0E0E0' }}>
        {(['popular', 'new'] as const).map(s => (
          <button key={s} onClick={() => handleSortChange(s)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: sort === s ? 700 : 400,
            color: sort === s ? '#4880FF' : '#848484',
            borderBottom: sort === s ? '2px solid #4880FF' : '2px solid transparent',
            marginBottom: '-2px',
          }}>
            {s === 'popular' ? 'Популярные' : 'Новые'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '13px', color: '#848484' }}>{total} идей</span>
      </div>

      {/* Ideas list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ideas.map(idea => (
          <div key={idea.id} style={{
            display: 'flex', gap: '16px', padding: '16px',
            border: '1px solid #E0E0E0', borderRadius: '14px', background: '#fff',
          }}>
            {/* Vote box */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '48px', minHeight: '64px', borderRadius: '8px', border: `1px solid ${idea.hasVoted ? '#4880FF' : '#E0E0E0'}`, background: idea.hasVoted ? 'rgba(72,128,255,0.08)' : 'transparent', cursor: 'pointer' }}
              onClick={() => handleVote(idea.id)}
            >
              {votingId === idea.id ? (
                <i className="ti ti-loader-2" style={{ fontSize: '18px', color: '#848484' }} />
              ) : (
                <i className="ti ti-chevron-up" style={{ fontSize: '18px', color: idea.hasVoted ? '#4880FF' : '#848484' }} />
              )}
              <span style={{ fontSize: '14px', fontWeight: 700, color: idea.hasVoted ? '#4880FF' : '#202224' }}>{idea.voteCount}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/ideas/${idea.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#202224', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {idea.title}
                </div>
                <div style={{ fontSize: '13px', color: '#848484', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {idea.description}
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {idea.category && (
                  <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#F5F6FA', color: '#848484' }}>
                    {idea.category}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: '#848484', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="ti ti-message-circle" style={{ fontSize: '13px' }} /> {idea.commentCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ideas.length === 0 && (
        <div style={{ textAlign: 'center', color: '#848484', padding: '48px' }}>Нет опубликованных идей</div>
      )}
    </div>
  )
}
