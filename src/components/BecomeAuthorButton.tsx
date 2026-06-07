// src/components/BecomeAuthorButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSession } from './SessionProvider'

export default function BecomeAuthorButton() {
  const [modalOpen, setModalOpen] = useState(false)
  const [bio,       setBio]       = useState('')
  const [city,      setCity]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const router  = useRouter()
  const { refresh } = useAppSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res  = await fetch('/api/become-author', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bio, city }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Ошибка'); return }

    await refresh()
    setModalOpen(false)
    router.push('/author-dashboard')
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        style={{ width: '100%', background: 'rgba(41,82,200,0.1)', border: '1px solid rgba(41,82,200,0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <i className="ti ti-upload" style={{ fontSize: '16px' }} />
        Стать автором и загружать модели
      </button>

      {/* Модальное окно */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />

          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '28px',
            width: '100%', maxWidth: '420px',
            zIndex: 201,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Стать автором</h2>
              <button onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '20px' }}>
                ×
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              После подтверждения вы сможете загружать RFA-модели и получать 80% с каждой продажи.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Город</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Москва"
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>О себе</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="BIM-специалист, архитектор..." rows={3}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
              </div>

              {error && (
                <div style={{ fontSize: '12px', color: 'var(--danger)', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Обрабатываем...' : 'Стать автором'}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
