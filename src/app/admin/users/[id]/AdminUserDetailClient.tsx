'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string; name: string; email: string; image: string | null
  role: string; emailVerified: boolean; isBanned: boolean
  createdAt: string; updatedAt: string
  ordersCount: number; productsCount: number; reviewsCount: number; favoritesCount: number
}

type AuthorProfile = {
  bio: string | null; city: string | null; isVerified: boolean
  autoPublish: boolean; totalSales: number; totalRevenue: number; createdAt: string
} | null

type Order = { id: string; status: string; totalAmount: number; itemNames: string[]; createdAt: string }
type Product = { id: string; name: string; price: number | null; isPublished: boolean; downloads: number; category: string; createdAt: string; emoji: string }
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
        position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function CollapsibleSection({
  title, count, href, defaultOpen = true, children,
}: {
  title: string; count?: number; href?: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '14px 20px', background: 'var(--admin-bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1px solid var(--admin-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            {title}{count !== undefined ? ` (${count})` : ''}
          </h3>
          {href && count !== undefined && count > 0 && (
            <Link
              href={href}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              Все <i className="ti ti-arrow-right" style={{ fontSize: '12px' }} />
            </Link>
          )}
        </div>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '16px', color: 'var(--admin-muted)' }} />
      </div>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  )
}

export default function AdminUserDetailClient({ user, authorProfile, orders, products }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const backUrl   = searchParams.get('from') === 'verification' ? '/admin/verification' : '/admin/users'
  const backLabel = searchParams.get('from') === 'verification' ? 'Верификация' : 'Пользователи'

  const [role,        setRole]        = useState(user.role)
  const [isBanned,    setIsBanned]    = useState(user.isBanned)
  const [autoPublish, setAutoPublish] = useState(authorProfile?.autoPublish ?? false)
  const [isVerified,  setIsVerified]  = useState(authorProfile?.isVerified ?? false)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  const formatDate  = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatMoney = (n: number)   => n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  async function saveChanges() {
    setSaving(true)
    await fetch('/api/admin/user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role, isBanned }),
    })
    if (authorProfile) {
      await fetch('/api/admin/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: isVerified ? 'approve' : 'reject' }),
      })
      await fetch('/api/admin/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'toggleAutoPublish', autoPublish }),
      })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .order-row:hover  { border-color: var(--admin-accent) !important; }
        .order-row        { transition: border-color 0.15s; }
        .product-row:hover { border-color: var(--admin-accent) !important; }
        .product-row      { transition: border-color 0.15s; }
      `}</style>

      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href={backUrl} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--admin-muted)', textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />{backLabel}
        </Link>
      </div>

      {/* Profile card */}
      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        {user.image ? (
          <img src={user.image} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(72,128,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--admin-accent)' }}>{user.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{user.name}</h1>
            {authorProfile?.isVerified && <i className="ti ti-rosette-discount-check" style={{ color: 'var(--admin-accent)', fontSize: '18px' }} />}
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: user.emailVerified ? 'rgba(0,182,155,0.1)' : 'rgba(255,167,86,0.1)', color: user.emailVerified ? '#00B69B' : '#FFA756' }}>
              {user.emailVerified ? 'Email подтверждён' : 'Email не подтверждён'}
            </span>
            {isBanned && <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: 'rgba(239,56,38,0.1)', color: 'var(--admin-danger)' }}>Заблокирован</span>}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '12px' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { label: 'Заказов',  value: user.ordersCount   },
              { label: 'Семейств', value: user.productsCount },
              { label: 'Отзывов',  value: user.reviewsCount  },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{s.label}</div>
              </div>
            ))}
            {authorProfile && (
              <>
                <div style={{ width: '1px', background: 'var(--admin-border)', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-accent)' }}>{authorProfile.totalSales}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Продаж</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-accent)' }}>{formatMoney(authorProfile.totalRevenue)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Выручка</div>
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Зарегистрирован</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{formatDate(user.createdAt)}</div>
        </div>
      </div>

      {/* Settings */}
      <CollapsibleSection title="Настройки пользователя">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Role */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>Роль</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>Права доступа пользователя</div>
            </div>
            <select value={role} onChange={e => setRole(e.target.value)} style={{
              padding: '8px 36px 8px 14px', borderRadius: '10px', fontSize: '13px',
              border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
              color: 'var(--admin-text)', outline: 'none', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23848484' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
            }}>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r === 'user' ? 'Покупатель' : r === 'author' ? 'Автор' : 'Администратор'}</option>
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
              {/* Bio + City */}
              {(authorProfile.bio || authorProfile.city) && (
                <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {authorProfile.city && (
                    <div style={{ padding: '12px 0', borderBottom: authorProfile.bio ? '1px solid var(--admin-border)' : 'none' }}>
                      <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>Город</div>
                      <div style={{ fontSize: '13px', color: 'var(--admin-text)' }}>{authorProfile.city}</div>
                    </div>
                  )}
                  {authorProfile.bio && (
                    <div style={{ padding: '12px 0' }}>
                      <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>О себе</div>
                      <div style={{ fontSize: '13px', color: 'var(--admin-text)', lineHeight: 1.5 }}>{authorProfile.bio}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Save + Ban */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={async () => {
            const newVal = !isBanned
            setIsBanned(newVal)
            await fetch('/api/admin/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, isBanned: newVal }) })
            router.refresh()
          }}
          style={{ padding: '11px 20px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${isBanned ? 'var(--admin-border)' : 'var(--admin-danger)'}`, background: 'transparent', color: isBanned ? 'var(--admin-muted)' : 'var(--admin-danger)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className={`ti ${isBanned ? 'ti-lock-open' : 'ti-ban'}`} />
          {isBanned ? 'Разблокировать' : 'Заблокировать'}
        </button>
        <button onClick={saveChanges} disabled={saving}
          style={{ padding: '11px 28px', borderRadius: '10px', border: 'none', background: saved ? 'var(--admin-success)' : 'var(--admin-accent)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <CollapsibleSection title="Заказы" count={orders.length} href={`/admin/transactions?userId=${user.id}`} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map(o => {
              const st = STATUS_STYLE[o.status] ?? { label: o.status, color: '#848484', bg: 'rgba(132,132,132,0.1)' }
              return (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="order-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--admin-border)', background: 'transparent', textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{o.itemNames[0]}{o.itemNames.length > 1 ? ` +${o.itemNames.length - 1}` : ''}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(o.createdAt)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', color: st.color, background: st.bg }}>{st.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)' }}>{formatMoney(o.totalAmount)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Products */}
      {products.length > 0 && (
        <CollapsibleSection title="Семейства" count={products.length} href={`/admin/families?authorId=${user.id}`} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {products.map(p => (
              <Link key={p.id} href={`/admin/families/${p.id}`} className="product-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--admin-border)', background: 'transparent', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{p.category} · {p.downloads} скачиваний</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', color: p.isPublished ? '#00B69B' : '#FFA756', background: p.isPublished ? 'rgba(0,182,155,0.1)' : 'rgba(255,167,86,0.1)' }}>
                    {p.isPublished ? 'Опубликовано' : 'На модерации'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: p.price ? 'var(--admin-text)' : '#00B69B' }}>
                    {p.price ? formatMoney(p.price) : 'Бесплатно'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
