// src/app/reset-password/confirm/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

function ConfirmForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    if (password.length < 8)  { setError('Минимум 8 символов'); return }

    setLoading(true)
    setError('')

    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)

    if (error) { setError('Ссылка устарела или недействительна'); return }
    router.push('/login?reset=1')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Новый пароль</h2>
      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Придумайте новый пароль для аккаунта</p>

      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Новый пароль</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 8 символов" required
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
      </div>
      <div>
        <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Повторите пароль</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
      </div>

      {error && <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</div>}

      <button type="submit" disabled={loading}
        style={{ width: '100%', background: loading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Сохраняем...' : 'Сохранить пароль'}
      </button>
    </form>
  )
}

export default function ResetPasswordConfirmPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '20px', fontWeight: 700 }}>
              <span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span>
            </div>
          </div>
          <Suspense fallback={<div>Загрузка...</div>}>
            <ConfirmForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
