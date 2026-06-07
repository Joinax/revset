// src/app/author-dashboard/AuthorDashboardClient.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import UploadProductForm from '@/components/UploadProductForm'

type Product = {
  id: string; name: string; price: number | null; isPublished: boolean
  isNew: boolean; downloads: number; previewEmoji: string; previewBg: string
  category: string; createdAt: string; reviewCount: number; salesCount: number
}

type User = {
  id: string; name: string; email: string
  isVerified: boolean; city: string | null; bio: string | null
}

type Stats = {
  totalProducts: number; publishedCount: number
  totalSales: number; totalRevenue: number; totalDownloads: number
}

type Pagination = { currentPage: number; totalPages: number; perPage: number }
type Props = { user: User; products: Product[]; stats: Stats; pagination: Pagination }

const TABS = [
  { key: 'products', label: 'Мои модели', icon: 'ti-file-3d'   },
  { key: 'upload',   label: 'Загрузить',  icon: 'ti-upload'    },
  { key: 'stats',    label: 'Статистика', icon: 'ti-chart-bar' },
  { key: 'profile',  label: 'Профиль',    icon: 'ti-user'      },
] as const

type Tab = typeof TABS[number]['key']

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <i className={`ti ${icon}`} style={{ fontSize: '18px', color: 'var(--accent)' }} />
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>
        {value}
      </div>
    </div>
  )
}

export default function AuthorDashboardClient({ user, products, stats, pagination }: Props) {
  const [activeTab,   setActiveTab]   = useState<Tab>('products')
  const [search,      setSearch]      = useState('')

  // Стейты редактирования профиля
  const [editProfile,  setEditProfile]  = useState(false)
  const [editName,     setEditName]     = useState(user.name)
  const [editCity,     setEditCity]     = useState(user.city ?? '')
  const [editBio,      setEditBio]      = useState(user.bio  ?? '')
  const [editLoading,  setEditLoading]  = useState(false)
  const [editError,    setEditError]    = useState('')
  const [editSuccess,  setEditSuccess]  = useState(false)
  const [currentName,  setCurrentName]  = useState(user.name)
  const [currentCity,  setCurrentCity]  = useState(user.city ?? '')
  const [currentBio,   setCurrentBio]   = useState(user.bio  ?? '')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAuthorProfileSave() {
    if (!editName.trim()) { setEditError('Имя не может быть пустым'); return }
    setEditLoading(true)
    setEditError('')
    const res  = await fetch('/api/profile/author', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: editName, city: editCity, bio: editBio }),
    })
    const data = await res.json()
    setEditLoading(false)
    if (!res.ok) { setEditError(data.error ?? 'Ошибка'); return }
    setCurrentName(editName)
    setCurrentCity(editCity)
    setCurrentBio(editBio)
    setEditProfile(false)
    setEditSuccess(true)
    setTimeout(() => setEditSuccess(false), 3000)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>

        {/* Шапка */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
            {currentName[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{currentName}</span>
              {user.isVerified && (
                <span style={{ fontSize: '11px', background: 'rgba(29,158,117,0.15)', color: '#1D9E75', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>✓ Верифицирован</span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{user.email}</div>
            {currentCity && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>📍 {currentCity}</div>}
          </div>
          <Link href="/account" style={{ fontSize: '13px', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px' }}>
            ← Личный кабинет
          </Link>
        </div>

        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`, marginBottom: '-1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize: '16px' }} />
              {tab.label}
              {tab.key === 'products' && (
                <span style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '11px', padding: '1px 6px', color: 'var(--muted)' }}>
                  {stats.totalProducts}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Мои модели ── */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
              <button onClick={() => setActiveTab('upload')}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-plus" style={{ fontSize: '16px' }} />
                Загрузить
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <i className="ti ti-file-3d" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                <p style={{ marginBottom: '16px' }}>У вас пока нет моделей</p>
                <button onClick={() => setActiveTab('upload')} className="btn-primary">Загрузить первую модель</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {filtered.map(product => (
                  <div key={product.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: product.previewBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {product.previewEmoji}
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>{product.category}</span>
                        <span>⬇ {product.downloads}</span>
                        <span>★ {product.reviewCount} отзывов</span>
                        <span>🛒 {product.salesCount} продаж</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                        {product.price !== null ? `${product.price} ₽` : 'Бесплатно'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: product.isPublished ? 'rgba(29,158,117,0.15)' : 'rgba(136,134,128,0.15)', color: product.isPublished ? '#1D9E75' : 'var(--muted)' }}>
                        {product.isPublished ? 'Опубликовано' : 'Черновик'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link href={`/product/${product.id}`}
                        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: 'var(--text)' }}>
                        Просмотр
                      </Link>
                      <Link href={`/author-dashboard/edit/${product.id}`}
                        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: 'var(--text)' }}>
                        Изменить
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Пагинация */}
        {activeTab === 'products' && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '20px 0' }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <a key={p} href={`/author-dashboard?page=${p}`}
                style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p === pagination.currentPage ? 'var(--accent)' : 'var(--border)'}`, background: p === pagination.currentPage ? 'var(--accent)' : 'var(--bg2)', color: p === pagination.currentPage ? '#fff' : 'var(--muted)', fontSize: '13px', fontWeight: p === pagination.currentPage ? 700 : 400, textDecoration: 'none' }}>
                {p}
              </a>
            ))}
          </div>
        )}

        {/* ── Загрузить ── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '560px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '20px' }}>Загрузить новую модель</h2>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <UploadProductForm />
            </div>
          </div>
        )}

        {/* ── Статистика ── */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <StatCard value={stats.totalProducts.toString()}                  label="Всего моделей" icon="ti-file-3d"        />
              <StatCard value={stats.publishedCount.toString()}                 label="Опубликовано"  icon="ti-eye"            />
              <StatCard value={stats.totalDownloads.toLocaleString('ru')}       label="Скачиваний"    icon="ti-download"       />
              <StatCard value={stats.totalSales.toString()}                     label="Продаж"        icon="ti-shopping-bag"   />
              <StatCard value={`${stats.totalRevenue.toLocaleString('ru')} ₽`} label="Выручка"       icon="ti-currency-rubel" />
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                <i className="ti ti-chart-bar" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                Детальная аналитика появится в следующей версии
              </div>
            </div>
          </div>
        )}

        {/* ── Профиль автора ── */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '480px' }}>
            {editSuccess && (
              <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1D9E75', marginBottom: '16px' }}>
                ✓ Профиль обновлён
              </div>
            )}

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '16px', marginBottom: '12px' }}>
              {editProfile ? (
                <>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Имя</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Город</label>
                    <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="Москва"
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>О себе</label>
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} placeholder="BIM-специалист..."
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
                  </div>
                  {editError && <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{editError}</div>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleAuthorProfileSave} disabled={editLoading}
                      style={{ flex: 1, background: editLoading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: editLoading ? 'not-allowed' : 'pointer' }}>
                      {editLoading ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                    <button onClick={() => { setEditProfile(false); setEditName(currentName); setEditCity(currentCity); setEditBio(currentBio); setEditError('') }}
                      style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { label: 'Имя',    value: currentName         },
                    { label: 'Email',  value: user.email          },
                    { label: 'Город',  value: currentCity || '—' },
                    { label: 'О себе', value: currentBio  || '—' },
                    { label: 'Статус', value: user.isVerified ? '✓ Верифицированный автор' : 'Не верифицирован' },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{row.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{row.value}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {!editProfile && (
              <button onClick={() => setEditProfile(true)}
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <i className="ti ti-pencil" style={{ fontSize: '16px' }} />
                Редактировать профиль
              </button>
            )}
          </div>
        )}

      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
