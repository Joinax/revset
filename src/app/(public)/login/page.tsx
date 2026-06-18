// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, sendVerificationEmail } from '@/lib/auth-client'
import { useAppSession } from '@/components/SessionProvider'

export default function LoginPage() {
  const router  = useRouter()
  const { refresh } = useAppSession()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setResendState('idle')
    setLoading(true)

    const { error } = await signIn.email({ email, password, callbackURL: '/' })

    if (error) {
      setLoading(false)
      // better-auth отдаёт 403 и для бана (наш хук, текст уже на русском),
      // и для неподтверждённой почты (текст "Email not verified" на английском) —
      // различаем по самому сообщению
      if (error.message === 'Email not verified') {
        setError('Email не подтверждён. Проверьте почту или запросите письмо повторно.')
        setNeedsVerification(true)
      } else if (error.status === 403 && error.message) {
        setError(error.message)
      } else {
        setError('Неверный email или пароль')
      }
      return
    }

    await refresh()   // ← обновляем сессию в провайдере
    router.push('/')
  }

  async function handleResend() {
    setResendState('sending')
    try {
      await sendVerificationEmail({ email, callbackURL: '/' })
      setResendState('sent')
    } catch {
      setResendState('idle')
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '32px' }}>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link href="/reset-password" style={{ fontSize: '12px', color: 'var(--accent)' }}>
                Забыли пароль?
              </Link>
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

            {needsVerification && (
              resendState === 'sent' ? (
                <div style={{ fontSize: '12px', color: 'var(--accent)' }}>
                  Письмо отправлено повторно. Проверьте почту (и папку «Спам»).
                </div>
              ) : (
                <button type="button" onClick={handleResend} disabled={resendState === 'sending'}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', color: 'var(--accent)', cursor: resendState === 'sending' ? 'not-allowed' : 'pointer', textAlign: 'left', fontWeight: 600 }}>
                  {resendState === 'sending' ? 'Отправляем...' : 'Отправить письмо повторно'}
                </button>
              )
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
