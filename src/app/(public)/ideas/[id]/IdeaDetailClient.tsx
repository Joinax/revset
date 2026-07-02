'use client'
// src/app/(public)/ideas/[id]/IdeaDetailClient.tsx
import { useState } from 'react'
import Link from 'next/link'

type Idea = {
  id: string; number: number; title: string; description: string
  category: string | null; voteCount: number; createdAt: string; hasVoted: boolean
}

type Comment = {
  id: string; text: string; createdAt: string; author: { name: string | null }
}

export default function IdeaDetailClient({ idea: initial, comments: initialComments, isLoggedIn }: {
  idea: Idea; comments: Comment[]; isLoggedIn: boolean
}) {
  const [idea, setIdea]         = useState(initial)
  const [comments, setComments] = useState(initialComments)
  const [voting, setVoting]     = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending]         = useState(false)
  const [commentSent, setCommentSent] = useState(false)

  async function handleVote() {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setVoting(true)
    const res = await fetch(`/api/ideas/${idea.id}/vote`, { method: 'POST' })
    if (res.ok) {
      const { voted, voteCount } = await res.json()
      setIdea(prev => ({ ...prev, hasVoted: voted, voteCount }))
    }
    setVoting(false)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setSending(true)
    await fetch(`/api/ideas/${idea.id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    })
    setSending(false)
    setCommentText('')
    setCommentSent(true)
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/ideas" style={{ fontSize: '13px', color: '#848484', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        <i className="ti ti-arrow-left" /> Все идеи
      </Link>

      {/* Idea header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {/* Vote box */}
        <div
          onClick={handleVote}
          style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '56px', minHeight: '72px', borderRadius: '10px', border: `1px solid ${idea.hasVoted ? '#4880FF' : '#E0E0E0'}`, background: idea.hasVoted ? 'rgba(72,128,255,0.08)' : 'transparent', cursor: 'pointer' }}
        >
          <i className={`ti ${voting ? 'ti-loader-2' : 'ti-chevron-up'}`} style={{ fontSize: '20px', color: idea.hasVoted ? '#4880FF' : '#848484' }} />
          <span style={{ fontSize: '16px', fontWeight: 700, color: idea.hasVoted ? '#4880FF' : '#202224' }}>{idea.voteCount}</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#848484' }}>Идея #{idea.number}</span>
            {idea.category && (
              <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#F5F6FA', color: '#848484' }}>{idea.category}</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>{idea.title}</h1>
          <p style={{ color: '#484848', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{idea.description}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button onClick={copyLink} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #E0E0E0', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#848484', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-share" /> Поделиться
        </button>
      </div>

      {/* Comments */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          Комментарии ({comments.length})
        </h2>

        {comments.length === 0 && !commentSent && (
          <p style={{ color: '#848484', fontSize: '14px' }}>Пока нет комментариев</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #E0E0E0', background: '#fff' }}>
              <div style={{ fontSize: '13px', color: '#202224', marginBottom: '6px' }}>{c.text}</div>
              <div style={{ fontSize: '12px', color: '#848484' }}>
                {c.author.name ?? 'Аноним'} · {new Date(c.createdAt).toLocaleDateString('ru')}
              </div>
            </div>
          ))}
        </div>

        {commentSent && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,182,155,0.1)', border: '1px solid rgba(0,182,155,0.3)', color: '#007a66', fontSize: '14px', marginBottom: '16px' }}>
            <i className="ti ti-check" /> Ваш комментарий отправлен на проверку
          </div>
        )}

        {!commentSent && (
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px' }}>
            <textarea
              placeholder={isLoggedIn ? 'Написать комментарий...' : 'Войдите чтобы прокомментировать'}
              value={commentText} onChange={e => setCommentText(e.target.value)}
              disabled={!isLoggedIn} required minLength={1} maxLength={2000} rows={3}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '14px', resize: 'vertical' }}
            />
            <button type="submit" disabled={sending || !isLoggedIn || !commentText.trim()} style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: '#4880FF', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, alignSelf: 'flex-end', height: '40px' }}>
              {sending ? '...' : <i className="ti ti-send" />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
