'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Order = {
  id: string
  status: string
  totalAmount: number
  paymentId: string | null
  createdAt: string
  updatedAt: string
}

type User = {
  id: string
  name: string
  email: string
  image: string | null
}

type Item = {
  id: string
  productId: string
  productName: string
  category: string
  emoji: string
  price: number
}

type Props = { order: Order; user: User; items: Item[] }

const STATUSES = [
  { value: 'PENDING',   label: 'Ожидание',  color: '#FFA756', bg: 'rgba(255,167,86,0.1)'  },
  { value: 'PAID',      label: 'Оплачено',  color: '#00B69B', bg: 'rgba(0,182,155,0.1)'   },
  { value: 'CANCELLED', label: 'Отменено',  color: '#EF3826', bg: 'rgba(239,56,38,0.1)'   },
  { value: 'REFUNDED',  label: 'Возврат',   color: '#848484', bg: 'rgba(132,132,132,0.1)' },
]

export default function AdminOrderDetailClient({ order, user, items }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentStatus = STATUSES.find(s => s.value === status)!

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatMoney = (n: number) =>
    n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  async function saveStatus() {
    if (status === order.status) return
    setSaving(true)
    await fetch('/api/admin/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, status }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--admin-muted)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          Назад
        </button>
        <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
          ID: <span style={{ fontFamily: 'monospace', color: 'var(--admin-text)' }}>{order.id}</span>
        </div>
      </div>

      {/* Header card */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 4px' }}>
            Заказ
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>{formatDate(order.createdAt)}</div>
          {order.paymentId && (
            <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '4px' }}>
              Платёж: <span style={{ fontFamily: 'monospace' }}>{order.paymentId}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--admin-text)' }}>
            {formatMoney(order.totalAmount)}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 12px', borderRadius: '20px',
            color: currentStatus.color, background: currentStatus.bg,
          }}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Покупатель */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Покупатель</h3>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user.image ? (
            <img src={user.image} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(72,128,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)' }}>{user.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>{user.email}</div>
          </div>
          <Link href={`/admin/users/${user.id}`} style={{
            fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            Профиль <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
          </Link>
        </div>
      </div>

      {/* Товары */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            Товары ({items.length})
          </h3>
        </div>
        <style>{`.order-item:hover { background: rgba(72,128,255,0.04) !important; } .order-item { transition: background 0.15s; }`}</style>
        {items.map((item, i) => (
          <Link key={item.id} href={`/admin/families/${item.productId}`} className="order-item" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: i < items.length - 1 ? '1px solid var(--admin-border)' : 'none',
            textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--admin-bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>
                {item.emoji}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{item.productName}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{item.category}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)' }}>
                {formatMoney(item.price)}
              </div>
              <i className="ti ti-arrow-right" style={{ fontSize: '14px', color: 'var(--admin-muted)' }} />
            </div>
          </Link>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderTop: '1px solid var(--admin-border)',
          background: 'var(--admin-bg2)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Итого</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text)' }}>
            {formatMoney(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Статус */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Статус заказа</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              style={{
                padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${status === s.value ? s.color : 'var(--admin-border)'}`,
                background: status === s.value ? s.bg : 'transparent',
                color: status === s.value ? s.color : 'var(--admin-muted)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={saveStatus} disabled={saving || status === order.status}
          style={{
            padding: '11px 28px', borderRadius: '10px', border: 'none',
            background: saved ? 'var(--admin-success)' : 'var(--admin-accent)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px',
            opacity: status === order.status && !saved ? 0.5 : 1,
          }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить статус'}
        </button>
      </div>
    </div>
  )
}
