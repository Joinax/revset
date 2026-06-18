'use client'
// src/app/admin/login/AdminLoginClient.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function AdminLoginClient() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
    })

    if (signInError) {
      setError(
        signInError.status === 429
          ? 'Слишком много попыток входа. Попробуйте позже.'
          : 'Неверный email или пароль'
      )
      setLoading(false)
      return
    }

    // Проверяем роль уже на сервере через редирект — proxy.ts защитит /admin
    // но для UX делаем явную проверку здесь
    if ((data?.user as any)?.role !== 'admin') {
      setError('У этого аккаунта нет доступа к административной панели')
      await authClient.signOut()
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div
      className="admin-root"
      style={{
        '--admin-bg-page': '#F5F6FA',
        '--admin-bg':      '#FFFFFF',
        '--admin-bg2':     '#F5F6FA',
        '--admin-border':  '#E0E0E0',
        '--admin-text':    '#202224',
        '--admin-muted':   '#848484',
        '--admin-accent':  '#4880FF',
        '--admin-danger':  '#EF3826',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--admin-bg-page)',
        fontFamily: 'Nunito Sans, sans-serif',
        padding: '24px',
      } as React.CSSProperties}
    >
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: '14px',
        padding: '40px 36px',
        boxShadow: '0 6px 54px rgba(0,0,0,0.05)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <img src="/revset_icon.svg" alt="REVSET" style={{ width: '40px', height: '40px' }} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>
              <span style={{ color: 'var(--admin-accent)' }}>REV</span>
              <span style={{ color: 'var(--admin-text)' }}>SET</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)' }}>
              Административная панель
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '4px' }}>
          Вход для администратора
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '28px' }}>
          Доступ только для сотрудников платформы
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@revset.ru"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
                color: 'var(--admin-text)', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', display: 'block', marginBottom: '6px' }}>
              Пароль
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
                color: 'var(--admin-text)', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: '13px', color: 'var(--admin-danger)',
              background: 'rgba(239,56,38,0.08)', borderRadius: '10px',
              padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px', borderRadius: '10px', border: 'none',
              background: 'var(--admin-accent)', color: '#fff',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--admin-muted)', textAlign: 'center', marginTop: '24px' }}>
          Это служебная страница. Если вы покупатель или автор,{' '}
          <a href="/login" style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>
            войдите здесь
          </a>.
        </p>
      </div>
    </div>
  )
}
