'use client'
// src/app/(public)/ideas/[id]/IdeaDetailClient.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const s3Url = (key: string | null | undefined): string | null =>
  key ? `${S3}/${BKT}/${key}` : null

type Idea = {
  id: string; number: number; title: string; description: string
  category: string | null; voteCount: number; createdAt: string; hasVoted: boolean
}

type Comment = {
  id: string; text: string; createdAt: string
  author: { id: string; name: string | null; image: string | null; isAuthor: boolean }
}

export default function IdeaDetailClient({ idea: initial, comments: initialComments, isLoggedIn }: {
  idea: Idea; comments: Comment[]; isLoggedIn: boolean
}) {
  const [idea, setIdea]               = useState(initial)
  const [comments, setComments]       = useState(initialComments)
  const [voting, setVoting]           = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending]         = useState(false)
  const [commentSent, setCommentSent] = useState(false)

  // Poll for newly approved comments every 20s
  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/ideas/${idea.id}`).catch(() => null)
      if (!res?.ok) return
      const data = await res.json()
      setComments(data.comments)
    }, 20_000)
    return () => clearInterval(timer)
  }, [idea.id])

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

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/ideas" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}
        className="back-link-ideas">
        <i className="ti ti-arrow-left" /> Все идеи
      </Link>

      {/* Idea card */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', padding: '24px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
        {/* Vote box */}
        <button
          onClick={handleVote}
          style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', width: '60px', minHeight: '80px', borderRadius: '12px',
            border: `2px solid ${idea.hasVoted ? 'var(--accent)' : 'var(--border)'}`,
            background: idea.hasVoted ? 'rgba(72,128,255,0.08)' : 'transparent',
            cursor: 'pointer', gap: '4px', transition: 'all 0.15s',
          }}
          className="vote-btn-detail"
        >
          <i className={`ti ${voting ? 'ti-loader-2' : 'ti-thumb-up'}`} style={{ fontSize: '22px', color: idea.hasVoted ? 'var(--accent)' : 'var(--muted)' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: idea.hasVoted ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{idea.voteCount}</span>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>голосов</span>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Идея #{idea.number}</span>
            {idea.category && (
              <span className="chip" style={{ fontSize: '11px' }}>{idea.category}</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-unbounded, Poppins, sans-serif)', fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>{idea.title}</h1>
          <p style={{ color: 'var(--text)', fontSize: '15px', lineHeight: 1.65, margin: 0, opacity: 0.85 }}>{idea.description}</p>
        </div>
      </div>

      {/* Comments */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>
          Комментарии ({comments.length})
        </h2>

        {comments.length === 0 && !commentSent && (
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>Пока нет комментариев — напишите первым!</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {comments.map(c => {
            const avatarUrl = s3Url(c.author.image)
            const initials  = (c.author.name ?? 'А')[0].toUpperCase()
            return (
              <div key={c.id} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Avatar */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {c.author.isAuthor ? (
                        <Link href={`/author/${c.author.id}`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                          className="comment-author-link">
                          {c.author.name ?? 'Аноним'}
                        </Link>
                      ) : (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{c.author.name ?? 'Аноним'}</span>
                      )}
                      {c.author.isAuthor && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(72,128,255,0.1)', color: 'var(--accent)', fontWeight: 600 }}>Автор</span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: 'auto' }}>
                        {new Date(c.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Text */}
                    <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{c.text}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {commentSent ? (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.25)', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-check" /> Ваш комментарий отправлен на проверку — появится после модерации
          </div>
        ) : (
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px' }}>
            <textarea
              placeholder={isLoggedIn ? 'Написать комментарий...' : 'Войдите чтобы прокомментировать'}
              value={commentText} onChange={e => setCommentText(e.target.value)}
              disabled={!isLoggedIn} required minLength={1} maxLength={2000} rows={3}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                  e.preventDefault()
                  if (commentText.trim()) handleComment(e as unknown as React.FormEvent)
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !isLoggedIn || !commentText.trim()}
              className="btn-primary"
              style={{ alignSelf: 'flex-end', padding: '10px 16px', fontSize: '13px', opacity: (sending || !isLoggedIn || !commentText.trim()) ? 0.5 : 1, cursor: (sending || !isLoggedIn || !commentText.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {sending ? <i className="ti ti-loader-2" /> : <i className="ti ti-send" />}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .back-link-ideas:hover { color: var(--accent) !important; }
        .vote-btn-detail:hover { border-color: var(--accent) !important; }
        .comment-author-link:hover { text-decoration: underline !important; }
      `}</style>
    </div>
  )
}
