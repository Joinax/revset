// src/components/BuyButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSession } from './SessionProvider'

type Props = {
  productId: string
  price:     number
  name:      string
}

export default function BuyButton({ productId, price, name }: Props) {
  const { user }  = useAppSession()
  const router    = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [mounted,  setMounted]  = useState(false)

  // Избегаем hydration mismatch — рендерим только после монтирования
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button style={{
        display: 'block', width: '100%',
        background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: '8px', padding: '13px',
        fontFamily: 'var(--font-unbounded), sans-serif',
        fontSize: '13px', fontWeight: 700,
        cursor: 'pointer', marginBottom: '8px',
        opacity: 0.7,
      }}>
        Купить · {price} ₽
      </button>
    )
  }

  async function handleBuy() {
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payment/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ошибка оплаты')
        setLoading(false)
        return
      }

      window.location.href = data.paymentUrl

    } catch {
      setError('Ошибка соединения')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          display: 'block', width: '100%',
          background: loading ? 'var(--bg3)' : 'var(--accent)',
          color: '#fff', border: 'none', borderRadius: '8px',
          padding: '13px',
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: '13px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '8px', transition: 'opacity 0.2s',
        }}
      >
        {loading ? 'Переходим к оплате...' : `Купить · ${price} ₽`}
      </button>

      {error && (
        <div style={{
          fontSize: '12px', color: 'var(--danger)',
          background: 'rgba(226,75,74,0.1)',
          border: '1px solid rgba(226,75,74,0.3)',
          borderRadius: '6px', padding: '8px 12px', marginBottom: '8px',
        }}>
          {error}
        </div>
      )}

      {!user && (
        <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>
          Для покупки необходимо войти в аккаунт
        </p>
      )}
    </div>
  )
}
