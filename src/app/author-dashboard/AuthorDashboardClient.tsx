// src/app/author-dashboard/AuthorDashboardClient.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

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

type Props = { user: User; products: Product[]; stats: Stats }

const TABS = [
  { key: 'products', label: 'Мои модели',  icon: 'ti-file-3d'     },
  { key: 'upload',   label: 'Загрузить',   icon: 'ti-upload'      },
  { key: 'stats',    label: 'Статистика',  icon: 'ti-chart-bar'   },
  { key: 'profile',  label: 'Профиль',     icon: 'ti-user'        },
] as const

type Tab = typeof TABS[number]['key']

// Карточка статистики
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

export default function AuthorDashboardClient({ user, products, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>

        {/* Шапка */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '24px',
          display: 'flex', alignItems: 'center', gap: '16px',
          marginBottom: '20px', flexWrap: 'wrap',
        }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
            {user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{user.name}</span>
              {user.isVerified && (
                <span style={{ fontSize: '11px', background: 'rgba(29,158,117,0.15)', color: '#1D9E75', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  ✓ Верифицирован
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{user.email}</div>
            {user.city && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>📍 {user.city}</div>}
          </div>
          <Link href="/account" style={{ fontSize: '13px', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px' }}>
            ← Личный кабинет
          </Link>
        </div>

        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                marginBottom: '-1px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
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
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по названию..."
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
                  <div key={product.id} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '16px',
                    display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                  }}>
                    {/* Превью */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: product.previewBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {product.previewEmoji}
                    </div>

                    {/* Инфо */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>{product.category}</span>
                        <span>⬇ {product.downloads}</span>
                        <span>★ {product.reviewCount} отзывов</span>
                        <span>🛒 {product.salesCount} продаж</span>
                      </div>
                    </div>

                    {/* Цена и статус */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-unbounded)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                        {product.price !== null ? `${product.price} ₽` : 'Бесплатно'}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                        background: product.isPublished ? 'rgba(29,158,117,0.15)' : 'rgba(136,134,128,0.15)',
                        color: product.isPublished ? '#1D9E75' : 'var(--muted)',
                      }}>
                        {product.isPublished ? 'Опубликовано' : 'Черновик'}
                      </span>
                    </div>

                    {/* Действия */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link href={`/product/${product.id}`}
                        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: 'var(--text)' }}>
                        Просмотр
                      </Link>
                      <button style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer' }}>
                        Изменить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Загрузить ── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '560px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '20px' }}>Загрузить новую модель</h2>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '16px' }}>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Название модели *</label>
                <input type="text" placeholder="Кресло Herman Miller Aeron"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Описание</label>
                <textarea placeholder="Подробное описание модели..." rows={3}
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Цена (₽)</label>
                  <input type="number" placeholder="0 = бесплатно"
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>LOD</label>
                  <select style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    <option>LOD 100</option>
                    <option>LOD 200</option>
                    <option>LOD 300</option>
                    <option>LOD 400</option>
                  </select>
                </div>
              </div>

              {/* Загрузка файла */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>RFA файл *</label>
                <div style={{
                  border: '2px dashed var(--border)', borderRadius: '10px',
                  padding: '32px', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}>
                  <i className="ti ti-upload" style={{ fontSize: '28px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Перетащите RFA файл сюда</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>или нажмите для выбора · Максимум 50 МБ</div>
                </div>
              </div>

              <div style={{ background: 'rgba(41,82,200,0.08)', border: '1px solid rgba(41,82,200,0.2)', borderRadius: '8px', padding: '12px', fontSize: '12px', color: 'var(--muted)' }}>
                <i className="ti ti-info-circle" style={{ marginRight: '6px', color: 'var(--accent)' }} />
                Загрузка файлов будет доступна после подключения хранилища S3. Форма уже готова.
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Опубликовать модель
              </button>
            </div>
          </div>
        )}

        {/* ── Статистика ── */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <StatCard value={stats.totalProducts.toString()}                       label="Всего моделей"    icon="ti-file-3d"     />
              <StatCard value={stats.publishedCount.toString()}                      label="Опубликовано"    icon="ti-eye"         />
              <StatCard value={stats.totalDownloads.toLocaleString('ru')}            label="Скачиваний"      icon="ti-download"    />
              <StatCard value={stats.totalSales.toString()}                          label="Продаж"          icon="ti-shopping-bag"/>
              <StatCard value={`${stats.totalRevenue.toLocaleString('ru')} ₽`}      label="Выручка"         icon="ti-currency-rubel"/>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                <i className="ti ti-chart-bar" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                Детальная аналитика по продажам появится после подключения оплаты
              </div>
            </div>
          </div>
        )}

        {/* ── Профиль автора ── */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '480px' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '16px' }}>
              {[
                { label: 'Имя',     value: user.name              },
                { label: 'Email',   value: user.email             },
                { label: 'Город',   value: user.city ?? '—'      },
                { label: 'О себе',  value: user.bio  ?? '—'      },
                { label: 'Статус',  value: user.isVerified ? '✓ Верифицированный автор' : 'Не верифицирован' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{row.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{row.value}</div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: '12px', width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <i className="ti ti-pencil" style={{ fontSize: '16px' }} />
              Редактировать профиль
            </button>
          </div>
        )}

      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
