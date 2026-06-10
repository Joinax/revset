// src/components/CartButton.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAppSession } from './SessionProvider'

export default function CartButton() {
  const { user } = useAppSession()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) { setCount(0); return }
    fetch('/api/cart/count')
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {})
  }, [user])

  // Слушаем кастомное событие обновления корзины
  useEffect(() => {
    function onCartUpdate(e: Event) {
      setCount((e as CustomEvent).detail.count)
    }
    window.addEventListener('cart-updated', onCartUpdate)
    return () => window.removeEventListener('cart-updated', onCartUpdate)
  }, [])

  if (!user) return null

  return (
    <Link href="/cart" className="nav-icon-btn" aria-label="Корзина" style={{ position: 'relative' }}>
      <i className="ti ti-shopping-cart" style={{ fontSize: '18px' }} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: '-4px', right: '-4px',
          background: 'var(--accent)', color: '#fff',
          fontSize: '10px', fontWeight: 700,
          width: '16px', height: '16px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
