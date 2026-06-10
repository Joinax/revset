// src/app/cart/CartClient.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const S3 = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET ?? 'revset'

type Item = {
  id: string; productId: string; name: string
  price: number; priceOld: number | null
  emoji: string; previewBg: string; images: string[]
  author: string; authorId: string; category: string
}

function dispatchCartUpdate(count: number) {
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count } }))
}

export default function CartClient({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial)
  const [removing, setRemoving] = useState<string | null>(null)
  const router = useRouter()

  const total = items.reduce((s, i) => s + i.price, 0)

  async function removeItem(productId: string) {
    setRemoving(productId)
    const res = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => prev.filter(i => i.productId !== productId))
      dispatchCartUpdate(data.count)
    }
    setRemoving(null)
  }

  async function checkout() {
    // Создаём заказ из корзины
    const res = await fetch('/api/cart/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl
    } else if (data.orderId) {
      router.push(`/account`)
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 48px', textAlign: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <i className="ti ti-shopping-cart-off" style={{ fontSize: '64px', opacity: 0.15, display: 'block', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Корзина пуста</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px' }}>Добавьте товары из каталога</p>
        <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 48px 64px', minHeight: 'calc(100vh - 64px)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>Корзина</h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>{items.length} {items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* Список товаров */}
        <div style={{ display: 'grid', gap: '10px' }}>
          {items.map(item => {
            const imgUrl = item.images.length > 0 ? `${S3}/${BKT}/${item.images[0]}` : null
            const discount = item.priceOld ? Math.round((1 - item.price / item.priceOld) * 100) : null

            return (
              <div key={item.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                transition: 'opacity 0.2s',
                opacity: removing === item.productId ? 0.5 : 1,
              }} className="cart-item">
                {/* Превью */}
                <Link href={`/product/${item.productId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '12px',
                    background: imgUrl ? '#f5f5f5' : item.previewBg,
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px',
                  }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : item.emoji
                    }
                  </div>
                </Link>

                {/* Инфо */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/product/${item.productId}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>
                    <Link href={`/author/${item.authorId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                      {item.author}
                    </Link>
                    {' · '}{item.category}
                  </div>
                </div>

                {/* Цена */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    {item.priceOld && (
                      <span style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                        {item.priceOld.toLocaleString('ru')} ₽
                      </span>
                    )}
                    {discount && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#E24B4A', background: 'rgba(226,75,74,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                        −{discount}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-unbounded)', fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                    {item.price.toLocaleString('ru')} ₽
                  </div>
                </div>

                {/* Удалить */}
                <button
                  onClick={() => removeItem(item.productId)}
                  disabled={removing === item.productId}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: '8px', width: '34px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--muted)', flexShrink: 0,
                    transition: 'all .15s',
                  }}
                  className="cart-remove-btn"
                >
                  <i className="ti ti-trash" style={{ fontSize: '15px' }} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Итого */}
        <div style={{
          position: 'sticky', top: '24px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '18px', padding: '24px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Итого</div>

          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            {items.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
                <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{i.name}</span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{i.price.toLocaleString('ru')} ₽</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>К оплате</span>
              <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>
                {total.toLocaleString('ru')} ₽
              </span>
            </div>
          </div>

          <button onClick={checkout} style={{
            width: '100%', padding: '14px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'opacity .15s',
          }} className="checkout-btn">
            Оплатить {total.toLocaleString('ru')} ₽
          </button>

          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <i className="ti ti-lock" style={{ fontSize: '12px' }} />
            Безопасная оплата
          </div>
        </div>
      </div>

      <style>{`
        .cart-item:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .cart-remove-btn:hover { border-color: #E24B4A !important; color: #E24B4A !important; }
        .checkout-btn:hover { opacity: 0.88; }
        @media (max-width: 900px) {
          div[style*="340px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
