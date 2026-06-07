// src/app/account/AccountClient.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { signOut } from '@/lib/auth-client'
import { useAppSession } from '@/components/SessionProvider'
import BecomeAuthorButton from '@/components/BecomeAuthorButton'

type Product   = { id: string; name: string; previewEmoji: string; previewBg: string }
type OrderItem = { id: string; price: number; product: Product }
type Order     = { id: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }
type Favorite  = { id: string; product: Product & { price: number | null } }
type User      = { id: string; name: string; email: string; image: string | null; role: string; createdAt: string; isAuthor: boolean }
type Props     = { user: User; orders: Order[]; favorites: Favorite[] }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Ожидает оплаты', color: '#F59E0B' },
  PAID:      { label: 'Оплачен',        color: '#1D9E75' },
  CANCELLED: { label: 'Отменён',        color: '#E24B4A' },
  REFUNDED:  { label: 'Возврат',        color: '#888680' },
}

const TABS = [
  { key: 'orders',    label: 'Покупки',   icon: 'ti-shopping-bag' },
  { key: 'favorites', label: 'Избранное', icon: 'ti-heart'        },
  { key: 'profile',   label: 'Профиль',   icon: 'ti-user'         },
] as const

type Tab = typeof TABS[number]['key']

export default function AccountClient({ user, orders, favorites }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#favorites') return 'favorites'
    return 'orders'
  })

  useEffect(() => {
    if (window.location.hash === '#favorites') setActiveTab('favorites')
  }, [])
  const [editMode,    setEditMode]    = useState(false)
  const [editName,    setEditName]    = useState(user.name)
  const [editLoading, setEditLoading] = useState(false)
  const [editError,   setEditError]   = useState('')
  const [editSuccess, setEditSuccess] = useState(false)
  const [currentName, setCurrentName] = useState(user.name)

  const router    = useRouter()
  const { refresh } = useAppSession()

  async function handleSignOut() {
    await signOut()
    await refresh()
    router.push('/')
  }

  async function handleProfileSave() {
    if (!editName.trim()) { setEditError('Имя не может быть пустым'); return }
    setEditLoading(true)
    setEditError('')

    const res  = await fetch('/api/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: editName }),
    })
    const data = await res.json()
    setEditLoading(false)

    if (!res.ok) { setEditError(data.error ?? 'Ошибка'); return }

    setCurrentName(data.name)
    setEditMode(false)
    setEditSuccess(true)
    setTimeout(() => setEditSuccess(false), 3000)
    await refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>

        {/* Шапка */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
            {currentName[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{currentName}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{user.email}</div>
            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', color: 'var(--muted)' }}>
                {user.role === 'author' ? '✓ Автор' : 'Покупатель'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                С нами с {new Date(user.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {user.isAuthor && (
              <Link href="/author-dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                Кабинет автора
              </Link>
            )}
            <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
              Выйти
            </button>
          </div>
        </div>

        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`, marginBottom: '-1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize: '16px' }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Покупки ── */}
        {activeTab === 'orders' && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <i className="ti ti-shopping-bag" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                <p style={{ marginBottom: '16px' }}>У вас пока нет покупок</p>
                <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
              </div>
            ) : orders.map(order => (
              <div key={order.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Заказ #{order.id.slice(-8).toUpperCase()}</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '12px' }}>{new Date(order.createdAt).toLocaleDateString('ru')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: STATUS_LABELS[order.status]?.color }}>{STATUS_LABELS[order.status]?.label}</span>
                    <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{order.totalAmount} ₽</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {order.items.map(item => (
                    <Link key={item.id} href={`/product/${item.product.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--text)', textDecoration: 'none' }}>
                      <span style={{ fontSize: '20px' }}>{item.product.previewEmoji}</span>
                      <span style={{ fontWeight: 500 }}>{item.product.name}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{item.price} ₽</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Избранное ── */}
        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <i className="ti ti-heart" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                <p style={{ marginBottom: '16px' }}>Вы ещё ничего не добавили в избранное</p>
                <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
              </div>
            ) : (
              <div className="cards-grid">
                {favorites.map(fav => (
                  <Link key={fav.id} href={`/product/${fav.product.id}`} className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', background: fav.product.previewBg }}>
                      {fav.product.previewEmoji}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fav.product.name}
                      </div>
                      {fav.product.price !== null
                        ? <span className="price">{fav.product.price} ₽</span>
                        : <span className="badge-free">Бесплатно</span>
                      }
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Профиль ── */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '480px' }}>

            {editSuccess && (
              <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1D9E75', marginBottom: '16px' }}>
                ✓ Профиль обновлён
              </div>
            )}

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '16px', marginBottom: '16px' }}>
              {editMode ? (
                <>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Имя</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{user.email}</div>
                  </div>
                  {editError && <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{editError}</div>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleProfileSave} disabled={editLoading}
                      style={{ flex: 1, background: editLoading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: editLoading ? 'not-allowed' : 'pointer' }}>
                      {editLoading ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                    <button onClick={() => { setEditMode(false); setEditName(currentName); setEditError('') }}
                      style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { label: 'Имя',   value: currentName },
                    { label: 'Email', value: user.email  },
                    { label: 'Роль',  value: user.role === 'author' ? 'Автор' : 'Покупатель' },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{row.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{row.value}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {!editMode && (
                <button onClick={() => setEditMode(true)}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-pencil" style={{ fontSize: '16px' }} />
                  Редактировать профиль
                </button>
              )}
                <Link href="/reset-password"
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-lock" style={{ fontSize: '16px' }} />
                  Изменить пароль
                </Link>
                {!user.isAuthor && <BecomeAuthorButton />}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
