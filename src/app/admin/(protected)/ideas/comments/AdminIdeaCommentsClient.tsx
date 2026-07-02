'use client'
// src/app/admin/ideas/comments/AdminIdeaCommentsClient.tsx
import { useState } from 'react'

type Comment = {
  id: string; text: string; createdAt: string
  author: { name: string | null }
  idea: { id: string; title: string; number: number }
}

export default function AdminIdeaCommentsClient({ initialComments }: { initialComments: Comment[] }) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [loading, setLoading]   = useState<string | null>(null)

  async function moderate(id: string, action: 'approve' | 'reject') {
    setLoading(id)
    await fetch('/api/admin/ideas/comments', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setComments(prev => prev.filter(c => c.id !== id))
    setLoading(null)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '24px' }}>
        Комментарии к идеям
      </h1>

      {comments.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: '48px' }}>Нет комментариев на проверке</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.map(c => (
            <div key={c.id} style={{
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderRadius: 'var(--admin-radius)', padding: '16px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '6px' }}>
                Идея #{c.idea.number}: <strong>{c.idea.title}</strong>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--admin-text)', marginBottom: '10px', borderLeft: '3px solid var(--admin-border)', paddingLeft: '10px' }}>
                {c.text}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                  {c.author.name ?? 'Аноним'} · {new Date(c.createdAt).toLocaleDateString('ru')}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => moderate(c.id, 'approve')}
                    disabled={loading === c.id}
                    style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--admin-success)', color: '#fff', fontSize: '12px', fontWeight: 600 }}
                  >
                    <i className="ti ti-check" /> Одобрить
                  </button>
                  <button
                    onClick={() => moderate(c.id, 'reject')}
                    disabled={loading === c.id}
                    style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--admin-danger)', cursor: 'pointer', background: 'transparent', color: 'var(--admin-danger)', fontSize: '12px', fontWeight: 600 }}
                  >
                    <i className="ti ti-x" /> Отклонить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
