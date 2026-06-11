'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  ordersCount: number
  productsCount: number
  reviewsCount: number
  favoritesCount: number
}

type AuthorProfile = {
  bio: string | null
  city: string | null
  isVerified: boolean
  autoPublish: boolean
  totalSales: number
  totalRevenue: number
  createdAt: string
} | null

type Order = {
  id: string
  status: string
  totalAmount: number
  itemNames: string[]
  createdAt: string
}

type Product = {
  id: string
  name: string
  price: number | null
  isPublished: boolean
  downloads: number
  category: string
  createdAt: string
  emoji: string
}

type Props = { user: User; authorProfile: AuthorProfile; orders: Order[]; products: Product[] }

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PAID:      { label: 'Оплачено',  color: '#00B69B', bg: 'rgba(0,182,155,0.1)'   },
  PENDING:   { label: 'Ожидание',  color: '#FFA756', bg: 'rgba(255,167,86,0.1)'  },
  CANCELLED: { label: 'Отменено',  color: '#EF3826', bg: 'rgba(239,56,38,0.1)'   },
  REFUNDED:  { label: 'Возврат',   color: '#848484', bg: 'rgba(132,132,132,0.1)' },
}

const ROLE_OPTIONS = ['user', 'author', 'admin']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
      background: checked ? 'var(--admin-accent)' : 'var(--admin-border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

export default function AdminUserDetailClient({ user, authorProfile, orders, products }: Props) {
  const router = useRouter()
  const [role, setRole] = useState(user.role)
  const [autoPublish, setAutoPublish] = useState(authorProfile?.autoPublish ?? false)
  const [isVerified, setIsVerified] = useState(authorProfile?.isVerified ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatMoney = (n: number) =>
    n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  async function saveChanges() {
    setSaving(true)

    // Сохраняем роль
    await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role }),
    })

    // Сохраняем настройки автора
    if (authorProfile) {
      await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: isVerified ? 'approve' : 'reject' }),
      })
      await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'toggleAutoPublish', autoPublish }),
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/users" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--admin-muted)', textDecoration: 'none',
        }}>
          <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          Пользователи
        </Link>
      </div>

      {/* Profile card */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '24px',
        display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        {user.image ? (
          <img src={user.image} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(72,128,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--admin-accent)' }}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{user.name}</h1>
            {authorProfile?.isVerified && (
              <i className="ti ti-rosette-discount-check" style={{ color: 'var(--admin-accent)', fontSize: '18px' }} />
            )}
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
              background: user.emailVerified ? 'rgba(0,182,155,0.1)' : 'rgba(255,167,86,0.1)',
              color: user.emailVerified ? '#00B69B' : '#FFA756',
            }}>
              {user.emailVerified ? 'Email подтверждён' : 'Email не подтверждён'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '12px' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Заказов',    value: user.ordersCount   },
              { label: 'Семейств',   value: user.productsCount },
              { label: 'Отзывов',    value: user.reviewsCount  },
              { label: 'Избранных',  value: user.favoritesCount },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Зарегистрирован</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{formatDate(user.createdAt)}</div>
        </div>
      </div>

      {/* Settings */}
      <Section title="Настройки пользователя">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Role */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Роль</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>Права доступа пользователя</div>
            </div>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
                border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
                color: 'var(--admin-text)', outline: 'none', cursor: 'pointer',
              }}>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r === 'user' ? 'Покупатель' : r === 'author' ? 'Автор' : 'Администратор'}
                </option>
              ))}
            </select>
          </div>

          {/* Author settings */}
          {authorProfile && (
            <>
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Верифицированный автор</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>Отображается значок верификации</div>
                </div>
                <Toggle checked={isVerified} onChange={setIsVerified} />
              </div>
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Авто-публикация</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>Семейства публикуются без модерации</div>
                </div>
                <Toggle checked={autoPublish} onChange={setAutoPublish} />
              </div>
              {/* Author stats */}
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Продаж</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>{authorProfile.totalSales}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Выручка</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>{formatMoney(authorProfile.totalRevenue)}</div>
                </div>
                {authorProfile.city && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Город</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)' }}>{authorProfile.city}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={saveChanges} disabled={saving}
          style={{
            padding: '11px 28px', borderRadius: '10px', border: 'none',
            background: saved ? 'var(--admin-success)' : 'var(--admin-accent)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <Section title={`Заказы (${orders.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map(o => {
              const st = STATUS_STYLE[o.status] ?? { label: o.status, color: '#848484', bg: 'rgba(132,132,132,0.1)' }
              return (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-bg2)',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>
                      {o.itemNames[0]}{o.itemNames.length > 1 ? ` +${o.itemNames.length - 1}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(o.createdAt)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)' }}>{formatMoney(o.totalAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Section title={`Семейства (${products.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {products.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-bg2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{p.category} · {p.downloads} скачиваний</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                    color:      p.isPublished ? '#00B69B' : '#FFA756',
                    background: p.isPublished ? 'rgba(0,182,155,0.1)' : 'rgba(255,167,86,0.1)',
                  }}>
                    {p.isPublished ? 'Опубликовано' : 'На модерации'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: p.price ? 'var(--admin-text)' : '#00B69B' }}>
                    {p.price ? formatMoney(p.price) : 'Бесплатно'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
