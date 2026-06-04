// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const router  = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn.email({
      email,
      password,
      callbackURL: '/',
    })

    setLoading(false)

    if (error) {
      setError('Неверный email или пароль')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '32px' }}>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>REV</span>
              <span style={{ color: 'var(--text)' }}>SET</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
            </div>

            {error && (
              <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '20px' }}>
            Нет аккаунта?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
