// src/app/account/AccountClient.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { useAppSession } from '@/components/SessionProvider'
import BecomeAuthorButton from '@/components/BecomeAuthorButton'
import UploadProductForm from '@/components/UploadProductForm'

type Product       = { id: string; name: string; previewEmoji: string; previewBg: string; images?: string[] }
type OrderItem     = { id: string; price: number; product: Product }
type Order         = { id: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }
type Favorite      = { id: string; product: Product & { price: number | null } }
type Following     = { id: string; createdAt: string; following: { id: string; name: string | null; authorProfile: { bio: string | null; isVerified: boolean } | null; _count: { products: number } } }
type ModerationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
type AuthorProduct = {
  id: string; name: string; price: number | null; isPublished: boolean
  moderationStatus: ModerationStatus; moderationComment?: string | null
  isNew: boolean; downloads: number; previewEmoji: string; previewBg: string; images?: string[]
  category: string; createdAt: string; reviewCount: number; salesCount: number
}
type AuthorStats   = {
  totalProducts: number; publishedCount: number; rejectedCount: number
  totalSales: number; totalRevenue: number; totalDownloads: number
}
type Pagination    = { currentPage: number; totalPages: number; perPage: number }
type User = {
  id: string; name: string; email: string; image: string | null
  role: string; createdAt: string; isAuthor: boolean
  isVerified?: boolean; city?: string | null; bio?: string | null
}
type TopProductEntry = { id: string; name: string; previewEmoji: string; previewBg: string; value: number; images?: string[] }
type AuthorSale = {
  id: string; price: number; createdAt: string; orderStatus: string
  buyerName: string
  product: { id: string; name: string; previewEmoji: string; previewBg: string; images?: string[] }
}
type AuthorFilters = { status: string; price: string; sort: string; query: string }

type Props = {
  followings?: Following[]
  user: User; orders: Order[]; favorites: Favorite[]
  authorProducts?: AuthorProduct[]; authorStats?: AuthorStats; authorPagination?: Pagination
  authorTopProducts?: { bySales: TopProductEntry[]; byDownloads: TopProductEntry[] }
  authorFilters?: AuthorFilters
  authorSales?: AuthorSale[]; authorSalesPagination?: Pagination
  hasPendingAuthorApplication?: boolean
}

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Ожидает оплаты', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  PAID:      { label: 'Оплачен',        color: '#1D9E75', bg: 'rgba(29,158,117,0.1)'  },
  CANCELLED: { label: 'Отменён',        color: '#E24B4A', bg: 'rgba(226,75,74,0.1)'   },
  REFUNDED:  { label: 'Возврат',        color: '#888680', bg: 'rgba(136,134,128,0.1)' },
}

const MODERATION_LABELS: Record<ModerationStatus, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: 'Черновик',     color: 'var(--muted)',  bg: 'var(--bg3)' },
  PENDING:  { label: 'На модерации', color: '#F59E0B',       bg: 'rgba(245,158,11,0.1)' },
  APPROVED: { label: 'Опубликовано', color: '#1D9E75',       bg: 'rgba(29,158,117,0.1)' },
  REJECTED: { label: 'Отклонено',    color: '#E24B4A',       bg: 'rgba(226,75,74,0.1)' },
}

function buildNav(isAuthor: boolean, productCount: number, rejectedCount: number) {
  const base = [
    { key: 'overview',  label: 'Обзор',        icon: 'ti-layout-dashboard', badge: null, badgeVariant: null },
    { key: 'orders',    label: 'Покупки',       icon: 'ti-shopping-bag',     badge: null, badgeVariant: null },
    { key: 'favorites',      label: 'Избранное',   icon: 'ti-heart',       badge: null, badgeVariant: null },
    { key: 'subscriptions', label: 'Подписки',    icon: 'ti-users',       badge: null, badgeVariant: null },
    { key: 'profile',   label: 'Профиль',       icon: 'ti-user',             badge: null, badgeVariant: null },
    { key: 'security',  label: 'Безопасность',  icon: 'ti-shield-lock',      badge: null, badgeVariant: null },
  ]
  if (!isAuthor) return base
  return [
    ...base,
    { key: 'divider',         label: '',              icon: '',             badge: null, badgeVariant: null },
    { key: 'author-stats',    label: 'Статистика',    icon: 'ti-chart-bar', badge: null, badgeVariant: null },
    { key: 'author-sales',    label: 'Продажи',       icon: 'ti-receipt',   badge: null, badgeVariant: null },
    { key: 'author-products', label: 'Мои модели',    icon: 'ti-file-3d',   badge: rejectedCount > 0 ? rejectedCount : null, badgeVariant: 'danger' as const },
    { key: 'author-upload',   label: 'Загрузить',     icon: 'ti-upload',    badge: null, badgeVariant: null },
  ]
}

type Tab = 'overview' | 'orders' | 'favorites' | 'subscriptions' | 'profile' | 'security'
         | 'author-products' | 'author-upload' | 'author-stats' | 'author-sales'


function SubscriptionsTab({ followings }: { followings: Following[] }) {
  const [search, setSearch] = React.useState('')
  const filtered = followings.filter(f =>
    (f.following.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Подписки</div>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{followings.length} авторов</span>
      </div>

      {followings.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-users" style={{ fontSize: '28px', opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>Нет подписок</p>
          <p style={{ fontSize: '13px', marginBottom: '20px' }}>Подписывайтесь на авторов, чтобы следить за новинками</p>
          <Link href="/catalog" className="btn-primary">Найти авторов</Link>
        </div>
      ) : (
        <>
          {/* Поиск */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по авторам..."
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px 10px 40px', color: 'var(--text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' }}
              className="sub-search"
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '14px' }}>Ничего не найдено</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {filtered.map(f => (
                <a key={f.id} href={`/author/${f.following.id}?from=subscriptions`} style={{ textDecoration: 'none' }} className="author-card">
                  <div className="author-card-inner">
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', fontWeight: 700, color: '#fff',
                      boxShadow: '0 4px 16px rgba(72,128,255,0.35)',
                      marginBottom: '12px',
                    }}>
                      {(f.following.name ?? 'А')[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                      {f.following.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: f.following.authorProfile?.isVerified ? '8px' : '0' }}>
                      {f.following._count.products} семейств
                    </div>
                    {f.following.authorProfile?.isVerified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#1D9E75', background: 'rgba(29,158,117,0.1)', padding: '2px 8px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(29,158,117,0.2)' }}>
                        <i className="ti ti-circle-check-filled" style={{ fontSize: '10px' }} />Проверен
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AccountClient({ user, orders, favorites, followings = [], authorProducts = [], authorStats, authorPagination, authorTopProducts, authorFilters, authorSales = [], authorSalesPagination, hasPendingAuthorApplication = false }: Props) {
  const searchParams = useSearchParams()
  const [activeTab,    setActiveTab]    = useState<Tab>(() => {
    const tabParam = searchParams.get('tab') as Tab | null
    const BASE_TABS: Tab[] = ['overview', 'orders', 'favorites', 'subscriptions', 'profile', 'security']
    const AUTHOR_TABS: Tab[] = ['author-products', 'author-upload', 'author-stats', 'author-sales']
    const VALID_TABS: Tab[] = user.isAuthor ? [...BASE_TABS, ...AUTHOR_TABS] : BASE_TABS
    return tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview'
  })
  const [ordersCollapsed,    setOrdersCollapsed]    = useState(false)
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false)
  const [returnTab,    setReturnTab]    = useState<Tab>('overview')
  const prevTabRef = useRef<Tab>('overview')

  useEffect(() => {
    // Запоминаем, откуда пришли, только если уходим НЕ из orders/favorites —
    // иначе кнопка "Назад" внутри них перезапишет себя при повторном входе
    if (prevTabRef.current !== 'orders' && prevTabRef.current !== 'favorites') {
      setReturnTab(prevTabRef.current)
    }
    prevTabRef.current = activeTab
  }, [activeTab])

  const [editMode,     setEditMode]     = useState(false)
  const [editName,     setEditName]     = useState(user.name)
  const [editLoading,  setEditLoading]  = useState(false)
  const [editError,    setEditError]    = useState('')
  const [editSuccess,  setEditSuccess]  = useState(false)
  const [currentName,  setCurrentName]  = useState(user.name)

  const [editAuthor,   setEditAuthor]   = useState(false)
  const [editAName,    setEditAName]    = useState(user.name)
  const [editCity,     setEditCity]     = useState(user.city ?? '')
  const [editBio,      setEditBio]      = useState(user.bio  ?? '')
  const [editALoading, setEditALoading] = useState(false)
  const [editAError,   setEditAError]   = useState('')
  const [editASuccess, setEditASuccess] = useState(false)
  const [currentCity,  setCurrentCity]  = useState(user.city ?? '')
  const [currentBio,   setCurrentBio]   = useState(user.bio  ?? '')
  const [search,       setSearch]       = useState(authorFilters?.query ?? '')
  const [avatarUrl,    setAvatarUrl]    = useState(user.image ?? '')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const router      = useRouter()
  const { refresh, updateUser } = useAppSession()

  // Статус модерации/публикации могут поменять в другой вкладке (модератор) —
  // подхватываем свежие данные при возврате на эту вкладку, без ручной перезагрузки
  useEffect(() => {
    function onFocus() { router.refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  // Лёгкий polling для авторов — пока вкладка открыта и видима, раз в 20 секунд
  // подтягиваем актуальный статус модерации, даже если человек не переключал фокус
  useEffect(() => {
    if (!user.isAuthor) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20000)
    return () => clearInterval(interval)
  }, [router, user.isAuthor])

  const paidOrders  = orders.filter(o => o.status === 'PAID')
  const totalSpent  = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const lastOrders  = orders.slice(0, 5)
  const lastFavs    = favorites.slice(0, 5)
  const apFilters = authorFilters ?? { status: 'all', price: 'all', sort: 'date', query: '' }

  function updateApFilters(updates: Partial<AuthorFilters>) {
    const merged = { ...apFilters, ...updates }
    const params = new URLSearchParams()
    params.set('tab', 'author-products')
    if (merged.status !== 'all') params.set('apStatus', merged.status)
    if (merged.price  !== 'all') params.set('apPrice',  merged.price)
    if (merged.sort   !== 'date') params.set('apSort',  merged.sort)
    if (merged.query) params.set('apQ', merged.query)
    router.push(`/account?${params}#author-products`)
  }

  // Debounce поиска по моделям — обновляем URL через 400мс после остановки ввода
  useEffect(() => {
    if (search === apFilters.query) return
    const timeout = setTimeout(() => updateApFilters({ query: search }), 400)
    return () => clearTimeout(timeout)
  }, [search])

  const filteredAP = authorProducts
  const nav         = buildNav(user.isAuthor, authorStats?.totalProducts ?? 0, authorStats?.rejectedCount ?? 0)
  const stats       = authorStats

  useEffect(() => {
    if (window.location.hash === '#favorites') setActiveTab('favorites')
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as Tab | null
    if (tab) setActiveTab(tab)
  }, [])

  async function handleSignOut() {
    await signOut(); await refresh(); router.push('/')
  }

  async function handleProfileSave() {
    if (!editName.trim()) { setEditError('Имя не может быть пустым'); return }
    setEditLoading(true); setEditError('')
    const res  = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName }) })
    const data = await res.json()
    setEditLoading(false)
    if (!res.ok) { setEditError(data.error ?? 'Ошибка'); return }
    setCurrentName(data.name); setEditMode(false); setEditSuccess(true)
    setTimeout(() => setEditSuccess(false), 3000)
    await refresh()
  }

  async function handleAuthorProfileSave() {
    if (!editAName.trim()) { setEditAError('Имя не может быть пустым'); return }
    setEditALoading(true); setEditAError('')
    const res  = await fetch('/api/profile/author', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editAName, city: editCity, bio: editBio }) })
    const data = await res.json()
    setEditALoading(false)
    if (!res.ok) { setEditAError(data.error ?? 'Ошибка'); return }
    setCurrentName(editAName); setCurrentCity(editCity); setCurrentBio(editBio)
    setEditAuthor(false); setEditASuccess(true)
    setTimeout(() => setEditASuccess(false), 3000)
  }

  async function handleAvatarDelete() {
    if (!avatarUrl) return
    setAvatarLoading(true)
    const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
    setAvatarLoading(false)
    if (res.ok) { setAvatarUrl(''); updateUser({ image: null }) }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setAvatarLoading(false)
    if (res.ok) { const url = data.image + '?t=' + Date.now(); setAvatarUrl(url); updateUser({ image: url }) }
  }

  function ProductThumb({ product }: { product: Product | AuthorProduct }) {
    const imgs = (product as Product).images
    return (
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: product.previewBg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        {imgs && imgs.length > 0
          ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${imgs[0]}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : product.previewEmoji}
      </div>
    )
  }

  function SectionTitle({ children }: { children: string }) {
    return <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{children}</div>
  }

  function EmptyState({ icon, title, sub, href, cta }: { icon: string; title: string; sub: string; href?: string; cta?: string }) {
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '28px', opacity: 0.4 }} />
        </div>
        <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>{title}</p>
        <p style={{ fontSize: '13px', marginBottom: href ? '20px' : 0 }}>{sub}</p>
        {href && cta && <Link href={href} className="btn-primary">{cta}</Link>}
      </div>
    )
  }

  const navItems = nav.filter(n => n.key !== 'divider')
  const authorNavKeys = ['author-products', 'author-upload', 'author-stats']

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="account-root">
        <div className="account-container">

        {/* ═══════════ САЙДБАР ═══════════ */}
        <aside className="account-sidebar">

          {/* Аватар */}
          <div className="sidebar-avatar-wrap">
            <label className="sidebar-avatar-label" title="Изменить фото">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              <div className="sidebar-avatar-img">
                {avatarUrl
                  ? <div style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: '50%', overflow: 'hidden' }}><img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                  : <span>{currentName[0].toUpperCase()}</span>
                }
                <div className="sidebar-avatar-overlay">
                  {avatarLoading
                    ? <i className="ti ti-loader-2 spin" style={{ fontSize: '18px', color: '#fff' }} />
                    : <i className="ti ti-camera" style={{ fontSize: '18px', color: '#fff' }} />
                  }
                </div>
              </div>
            </label>
            <div className="sidebar-user-name">{currentName}</div>
            <div className="sidebar-user-email">{user.email}</div>
            {avatarUrl && (
              <button onClick={handleAvatarDelete} disabled={avatarLoading} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: 'var(--muted)', padding: '2px 0',
                fontFamily: 'inherit', transition: 'color 0.15s',
              }} className="avatar-delete-btn">
                Удалить фото
              </button>
            )}
          </div>

          {/* Разделитель */}
          <div className="sidebar-divider" />

          {/* Навигация */}
          <nav className="sidebar-nav">
            {nav.map((item, i) => {
              if (item.key === 'divider') return (
                <div key="divider" className="sidebar-section-label">
                  <i className="ti ti-pencil" style={{ fontSize: '12px', marginRight: '6px' }} />
                  <span>Для авторов</span>
                </div>
              )
              const isActive = activeTab === item.key
              const isAuthorItem = authorNavKeys.includes(item.key)
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key as Tab); setEditMode(false); setEditAuthor(false) }}
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''} ${isAuthorItem ? 'author-item' : ''}`}

                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: '18px', flexShrink: 0 }} />
                  <span className="sidebar-nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`sidebar-badge ${item.badgeVariant === 'danger' ? 'sidebar-badge--danger' : ''}`}>{item.badge}</span>
                  )}
                </button>
              )
            })}
          </nav>

        </aside>

        {/* ═══════════ КОНТЕНТ ═══════════ */}
        <main className="account-main">

          {/* ── Обзор ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                  Добро пожаловать, {currentName.split(' ')[0]}!
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  С нами с {new Date(user.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  {
                    icon: 'ti-shopping-bag', label: 'Покупок',
                    value: paidOrders.length,
                    accent: 'var(--accent)', bg: 'rgba(72,128,255,0.1)',
                    tab: 'orders' as Tab,
                  },
                  {
                    icon: 'ti-heart', label: 'Избранного',
                    value: favorites.length,
                    accent: 'var(--danger)', bg: 'rgba(226,75,74,0.1)',
                    tab: 'favorites' as Tab,
                  },
                  {
                    icon: 'ti-currency-rubel', label: 'Потрачено',
                    value: `${totalSpent.toLocaleString('ru')} ₽`,
                    accent: 'var(--success)', bg: 'rgba(29,158,117,0.1)',
                    tab: 'orders' as Tab,
                  },
                ].map(s => (
                  <div
                    key={s.label}
                    onClick={() => s.tab && setActiveTab(s.tab)}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${s.accent}`,
                      borderRadius: '16px',
                      padding: '20px 22px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                      cursor: s.tab ? 'pointer' : 'default',
                      boxShadow: 'var(--shadow-rest)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    className={s.tab ? 'stat-card sales-card' : 'sales-card'}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{s.value}</div>
                    </div>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${s.icon}`} style={{ fontSize: '24px', color: s.accent }} />
                    </div>
                  </div>
                ))}
              </div>

              {user.isAuthor && stats && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-badge" style={{ fontSize: '15px', color: 'var(--accent)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Статистика автора</span>
                    </div>
                    <button onClick={() => setActiveTab('author-stats')} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Подробнее →</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {[
                      { icon: 'ti-file-3d',       label: 'Моделей',    value: stats.totalProducts,                            accent: 'var(--accent)', bg: 'rgba(72,128,255,0.08)',  tab: 'author-products' as Tab },
                      { icon: 'ti-download',       label: 'Скачиваний', value: stats.totalDownloads.toLocaleString('ru'),       accent: '#F59E0B',        bg: 'rgba(245,158,11,0.08)', tab: 'author-stats' as Tab },
                      { icon: 'ti-shopping-bag',   label: 'Продаж',     value: stats.totalSales,                               accent: '#1D9E75',        bg: 'rgba(29,158,117,0.08)', tab: 'author-sales' as Tab },
                      { icon: 'ti-currency-rubel', label: 'Выручка',    value: `${stats.totalRevenue.toLocaleString('ru')} ₽`, accent: '#1D9E75',        bg: 'rgba(29,158,117,0.08)', tab: 'author-sales' as Tab },
                    ].map((s, i, arr) => (
                      <div key={s.label} onClick={() => s.tab && setActiveTab(s.tab)} style={{ padding: '18px 20px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: s.tab ? 'pointer' : 'default', transition: 'background 0.15s' }} className={s.tab ? 'author-stat-cell' : ''}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                          <i className={`ti ${s.icon}`} style={{ fontSize: '15px', color: s.accent }} />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: s.accent, letterSpacing: '-0.02em' }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                <div style={{ padding: '14px 20px', borderBottom: ordersCollapsed ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setOrdersCollapsed(c => !c)} aria-label={ordersCollapsed ? 'Развернуть' : 'Свернуть'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px', display: 'flex' }}>
                      <i className={`ti ti-chevron-${ordersCollapsed ? 'right' : 'down'}`} style={{ fontSize: '15px' }} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Последние покупки</span>
                  </div>
                  {orders.length > 0 && <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Все покупки →</button>}
                </div>
                {!ordersCollapsed && (lastOrders.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    <i className="ti ti-shopping-bag" style={{ fontSize: '32px', opacity: 0.3, display: 'block', marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px' }}>Покупок пока нет</div>
                  </div>
                ) : lastOrders.map((order, i) => (
                  <div key={order.id} style={{ padding: '12px 20px', borderBottom: i < lastOrders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>#{order.id.slice(-8).toUpperCase()}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(order.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', marginLeft: 'auto', color: STATUS_LABELS[order.status]?.color, background: STATUS_LABELS[order.status]?.bg }}>{STATUS_LABELS[order.status]?.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{order.totalAmount.toLocaleString('ru')} ₽</span>
                    </div>
                    {order.items.map(item => (
                      <Link key={item.id} href={`/product/${item.product.id}?from=overview`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '6px 8px', borderRadius: '8px' }} className="order-item-link">
                        <ProductThumb product={item.product} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>RFA · Revit</div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{item.price.toLocaleString('ru')} ₽</span>
                      </Link>
                    ))}
                  </div>
                )))}
              </div>

              {lastFavs.length > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  <div style={{ padding: '14px 20px', borderBottom: favoritesCollapsed ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={() => setFavoritesCollapsed(c => !c)} aria-label={favoritesCollapsed ? 'Развернуть' : 'Свернуть'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px', display: 'flex' }}>
                        <i className={`ti ti-chevron-${favoritesCollapsed ? 'right' : 'down'}`} style={{ fontSize: '15px' }} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Избранное</span>
                    </div>
                    {favorites.length > 0 && <button onClick={() => setActiveTab('favorites')} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Все {favorites.length} →</button>}
                  </div>
                  {!favoritesCollapsed && (
                    <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                      {lastFavs.map(fav => (
                        <Link key={fav.id} href={`/product/${fav.product.id}?from=overview`} style={{ textDecoration: 'none', borderRadius: '14px', overflow: 'hidden', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'block', boxShadow: 'var(--shadow-rest)' }} className="fav-card">
                          <div style={{ aspectRatio: '1 / 1', background: fav.product.previewBg, overflow: 'hidden' }}>
                            {fav.product.images && fav.product.images.length > 0
                              ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${fav.product.images[0]}`} alt={fav.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>{fav.product.previewEmoji}</div>}
                          </div>
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{fav.product.name}</div>
                            {fav.product.price !== null ? <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{fav.product.price} ₽</span> : <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '2px 8px', borderRadius: '20px' }}>Бесплатно</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!user.isAuthor && (
                <div style={{ background: 'rgba(72,128,255,0.06)', border: '1px solid rgba(72,128,255,0.15)', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {hasPendingAuthorApplication ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="ti ti-clock-hour-4" style={{ fontSize: '20px', color: 'var(--accent)' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>Заявка на рассмотрении</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Мы сообщим, когда модератор примет решение</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Станьте автором</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Загружайте BIM-семейства и зарабатывайте</div>
                      </div>
                      <BecomeAuthorButton />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Покупки ── */}
          {activeTab === 'orders' && (
            <div>
              <button onClick={() => setActiveTab(returnTab)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }} className="back-link">
                <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
                Назад
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Мои покупки</div>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{paidOrders.length} {paidOrders.length === 1 ? 'покупка' : 'покупок'}</span>
              </div>
              {orders.length === 0 ? <EmptyState icon="ti-shopping-bag" title="Покупок пока нет" sub="Найдите нужные BIM-модели в каталоге" href="/catalog" cta="Перейти в каталог" /> : (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  {orders.flatMap((order, oi) =>
                    order.items.map((item, ii) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: (oi < orders.length - 1 || ii < order.items.length - 1) ? '1px solid var(--border)' : 'none' }} className="purchase-row">
                        <Link href={`/product/${item.product.id}?from=orders`} style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                          {/* Картинка */}
                          <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: item.product.previewBg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            {item.product.images && item.product.images.length > 0
                              ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${item.product.images[0]}`} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : item.product.previewEmoji}
                          </div>
                          {/* Название + мета */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.product.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              {item.price.toLocaleString('ru')} ₽ · {new Date(order.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        </Link>
                        {/* Кнопка скачать — только для оплаченных */}
                        {order.status === 'PAID' && (
                          <a
                            href={`/api/download/${item.product.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', flexShrink: 0, transition: 'border-color 0.15s, color 0.15s' }}
                            className="dl-btn"
                          >
                            Скачать
                          </a>
                        )}
                        {order.status !== 'PAID' && (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', color: STATUS_LABELS[order.status]?.color, background: STATUS_LABELS[order.status]?.bg, flexShrink: 0 }}>
                            {STATUS_LABELS[order.status]?.label}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Избранное ── */}
          {activeTab === 'favorites' && (
            <div>
              <button onClick={() => setActiveTab(returnTab)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }} className="back-link">
                <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
                Назад
              </button>
              <SectionTitle>Избранное</SectionTitle>
              {favorites.length === 0 ? <EmptyState icon="ti-heart" title="Избранное пусто" sub="Добавляйте понравившиеся модели" href="/catalog" cta="Перейти в каталог" /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {favorites.map(fav => (
                    <Link key={fav.id} href={`/product/${fav.product.id}?from=favorites`} style={{ textDecoration: 'none', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'block', boxShadow: 'var(--shadow-rest)' }} className="fav-card">
                      <div style={{ aspectRatio: '1 / 1', background: fav.product.previewBg, overflow: 'hidden' }}>
                        {fav.product.images && fav.product.images.length > 0 ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${fav.product.images[0]}`} alt={fav.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>{fav.product.previewEmoji}</div>}
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.product.name}</div>
                        {fav.product.price !== null ? <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>{fav.product.price} ₽</span> : <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '3px 9px', borderRadius: '20px' }}>Бесплатно</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* ── Подписки ── */}
          {activeTab === 'subscriptions' && (
            <SubscriptionsTab followings={followings ?? []} />
          )}

          {/* ── Профиль ── */}
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gap: '12px', maxWidth: '580px' }}>
              <SectionTitle>Личные данные</SectionTitle>
              {editSuccess && <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.25)', borderRadius: '12px', padding: '13px 16px', fontSize: '13px', color: '#1D9E75', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="ti ti-circle-check" style={{ fontSize: '17px' }} />Профиль успешно обновлён</div>}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Основная информация</span>
                  {!editMode && <button onClick={() => setEditMode(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}><i className="ti ti-pencil" style={{ fontSize: '13px', color: 'var(--accent)' }} />Изменить</button>}
                </div>
                {editMode ? (
                  <div style={{ padding: '20px', display: 'grid', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Имя</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--accent)', borderRadius: '10px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                      <div style={{ fontSize: '14px', color: 'var(--muted)', padding: '11px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1.5px solid var(--border)' }}>{user.email}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>Email изменить нельзя</div>
                    </div>
                    {editError && <div style={{ fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-alert-circle" style={{ fontSize: '14px' }} />{editError}</div>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleProfileSave} disabled={editLoading} style={{ flex: 1, background: editLoading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: editLoading ? 'not-allowed' : 'pointer' }}>{editLoading ? 'Сохраняем...' : 'Сохранить'}</button>
                      <button onClick={() => { setEditMode(false); setEditName(currentName); setEditError('') }} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {[
                      { label: 'Имя',             value: currentName, icon: 'ti-user',     note: null },
                      { label: 'Email',            value: user.email,  icon: 'ti-mail',     note: 'Используется для входа и уведомлений' },
                      { label: 'Дата регистрации', value: new Date(user.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }), icon: 'ti-calendar', note: null },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(72,128,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${row.icon}`} style={{ fontSize: '15px', color: 'var(--accent)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px', fontWeight: 500 }}>{row.label}</div>
                          <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
                          {row.note && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{row.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {user.isAuthor && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-badge" style={{ fontSize: '15px', color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Профиль автора</span>
                    </div>
                    {!editAuthor && (
                      <button onClick={() => setEditAuthor(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                        <i className="ti ti-pencil" style={{ fontSize: '13px', color: 'var(--accent)' }} />Изменить
                      </button>
                    )}
                  </div>
                  {editASuccess && (
                    <div style={{ margin: '12px 20px 0', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.25)', borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: '#1D9E75', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-circle-check" style={{ fontSize: '16px' }} />Профиль автора обновлён
                    </div>
                  )}
                  {editAuthor ? (
                    <div style={{ padding: '20px', display: 'grid', gap: '14px' }}>
                      {[
                        { label: 'Имя',    value: editAName, onChange: setEditAName, type: 'input',    placeholder: '' },
                        { label: 'Город',  value: editCity,  onChange: setEditCity,  type: 'input',    placeholder: 'Москва' },
                        { label: 'О себе', value: editBio,   onChange: setEditBio,   type: 'textarea', placeholder: 'BIM-специалист...' },
                      ].map(field => (
                        <div key={field.label}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                          {field.type === 'textarea'
                            ? <textarea value={field.value} onChange={e => field.onChange(e.target.value)} rows={3} placeholder={field.placeholder} style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--accent)', borderRadius: '10px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            : <input type="text" value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder} style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--accent)', borderRadius: '10px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />}
                        </div>
                      ))}
                      {editAError && <div style={{ fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-alert-circle" style={{ fontSize: '14px' }} />{editAError}</div>}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleAuthorProfileSave} disabled={editALoading} style={{ flex: 1, background: editALoading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: editALoading ? 'not-allowed' : 'pointer' }}>{editALoading ? 'Сохраняем...' : 'Сохранить'}</button>
                        <button onClick={() => { setEditAuthor(false); setEditAName(currentName); setEditCity(currentCity); setEditBio(currentBio); setEditAError('') }} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {[
                        { label: 'Город',  value: currentCity || '—', icon: 'ti-map-pin'     },
                        { label: 'О себе', value: currentBio  || '—', icon: 'ti-info-circle' },
                        { label: 'Статус', value: user.isVerified ? '✓ Верифицированный автор' : 'На проверке', icon: 'ti-badge' },
                      ].map((row, i, arr) => (
                        <div key={row.label} style={{ padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(72,128,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                            <i className={`ti ${row.icon}`} style={{ fontSize: '15px', color: 'var(--accent)' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px', fontWeight: 500 }}>{row.label}</div>
                            <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>{row.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleSignOut} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '14px 20px',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '16px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500, color: '#E24B4A',
                transition: 'background 0.15s', fontFamily: 'inherit',
                boxShadow: 'var(--shadow-rest)',
              }} className="signout-btn">
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(226,75,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-logout" style={{ fontSize: '18px', color: '#E24B4A' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Выйти из аккаунта</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Завершить текущую сессию</div>
                </div>
              </button>
            </div>
          )}

          {/* ── Безопасность ── */}
          {activeTab === 'security' && (
            <div style={{ display: 'grid', gap: '12px', maxWidth: '580px' }}>
              <SectionTitle>Безопасность</SectionTitle>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: '13px', fontWeight: 600 }}>Вход и пароль</span></div>
                <Link href="/reset-password" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }} className="profile-action-row">
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(72,128,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-lock" style={{ fontSize: '18px', color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Изменить пароль</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Рекомендуем менять пароль раз в полгода</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ fontSize: '16px', color: 'var(--muted)' }} />
                </Link>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Активные сессии</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(29,158,117,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-device-laptop" style={{ fontSize: '18px', color: '#1D9E75' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>Текущий сеанс</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Браузер · Активен сейчас</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1D9E75', background: 'rgba(29,158,117,0.1)', padding: '3px 10px', borderRadius: '20px' }}>Активен</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Мои модели ── */}
          {activeTab === 'author-products' && user.isAuthor && (
            <div id="author-products">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Мои модели</div>
                <button onClick={() => setActiveTab('author-upload')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  <i className="ti ti-plus" style={{ fontSize: '15px' }} />Загрузить
                </button>
              </div>

              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 16px', color: 'var(--text)', fontSize: '13px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg2)', borderRadius: '10px', padding: '4px' }}>
                  {([['all', 'Все'], ['DRAFT', 'Черновик'], ['PENDING', 'На модерации'], ['APPROVED', 'Опубликовано'], ['REJECTED', 'Отклонено']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => updateApFilters({ status: val })} style={{
                      padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                      background: apFilters.status === val ? 'var(--bg)' : 'transparent',
                      color: apFilters.status === val ? 'var(--accent)' : 'var(--muted)',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      boxShadow: apFilters.status === val ? 'var(--shadow-rest)' : 'none',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg2)', borderRadius: '10px', padding: '4px' }}>
                  {([['all', 'Все'], ['paid', 'Платные'], ['free', 'Бесплатные']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => updateApFilters({ price: val })} style={{
                      padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                      background: apFilters.price === val ? 'var(--bg)' : 'transparent',
                      color: apFilters.price === val ? 'var(--accent)' : 'var(--muted)',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      boxShadow: apFilters.price === val ? 'var(--shadow-rest)' : 'none',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
                <select value={apFilters.sort} onChange={e => updateApFilters({ sort: e.target.value })} style={{
                  marginLeft: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '8px 34px 8px 12px', fontSize: '12px', color: 'var(--text)',
                  outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23848484' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}>
                  <option value="date">По дате</option>
                  <option value="sales">По продажам</option>
                  <option value="downloads">По скачиваниям</option>
                </select>
              </div>

              {filteredAP.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <i className="ti ti-file-3d" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
                  <p style={{ marginBottom: '16px', fontSize: '14px' }}>{search || apFilters.status !== 'all' || apFilters.price !== 'all' ? 'Ничего не найдено' : 'У вас пока нет моделей'}</p>
                  {!search && apFilters.status === 'all' && apFilters.price === 'all' && <button onClick={() => setActiveTab('author-upload')} className="btn-primary">Загрузить первую модель</button>}
                </div>
              ) : (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  {filteredAP.map((product, i) => (
                    <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 20px', borderBottom: i < filteredAP.length - 1 ? '1px solid var(--border)' : 'none' }} className="model-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Превью */}
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: product.previewBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, overflow: 'hidden' }}>
                        {product.images && product.images.length > 0 ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${product.images[0]}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : product.previewEmoji}
                      </div>

                      {/* Название + мета */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '10px' }}>
                          <span><i className="ti ti-download" style={{ fontSize: '11px' }} /> {product.downloads}</span>
                          <span><i className="ti ti-star" style={{ fontSize: '11px' }} /> {product.reviewCount} отз.</span>
                          <span><i className="ti ti-shopping-bag" style={{ fontSize: '11px' }} /> {product.salesCount} прод.</span>
                        </div>
                      </div>

                      {/* Цена */}
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                        {product.price !== null ? `${product.price} ₽` : 'Бесплатно'}
                      </span>

                      {/* Статус */}
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', flexShrink: 0, background: MODERATION_LABELS[product.moderationStatus].bg, color: MODERATION_LABELS[product.moderationStatus].color, border: `1px solid ${MODERATION_LABELS[product.moderationStatus].color}40` }}>
                        {MODERATION_LABELS[product.moderationStatus].label}
                      </span>

                      {/* Действия */}
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <Link href={`/product/${product.id}?from=author-products`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', transition: 'border-color 0.15s, color 0.15s' }} className="model-action-btn">
                          <i className="ti ti-eye" style={{ fontSize: '14px' }} />
                          Просмотр
                        </Link>
                        <Link href={`/author-dashboard/edit/${product.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(72,128,255,0.25)', background: 'rgba(72,128,255,0.1)', transition: 'background 0.15s, box-shadow 0.15s, transform 0.15s' }} className="model-edit-btn">
                          <i className="ti ti-pencil" style={{ fontSize: '14px' }} />
                          Изменить
                        </Link>
                      </div>
                    </div>

                    {product.moderationStatus === 'REJECTED' && product.moderationComment && (
                      <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,56,38,0.06)', border: '1px solid rgba(239,56,38,0.2)', marginLeft: '58px' }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', marginBottom: '3px' }}>Модератор отклонил — нужно исправить</div>
                          <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{product.moderationComment}</div>
                        </div>
                      </div>
                    )}
                    </div>
                  ))}
                </div>
              )}

              {authorPagination && authorPagination.totalPages > 1 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '20px 0' }}>
                  {Array.from({ length: authorPagination.totalPages }, (_, i) => i + 1).map(p => {
                    const pageParams = new URLSearchParams()
                    pageParams.set('tab', 'author-products')
                    if (p !== 1) pageParams.set('page', String(p))
                    if (apFilters.status !== 'all') pageParams.set('apStatus', apFilters.status)
                    if (apFilters.price  !== 'all') pageParams.set('apPrice',  apFilters.price)
                    if (apFilters.sort   !== 'date') pageParams.set('apSort',  apFilters.sort)
                    if (apFilters.query) pageParams.set('apQ', apFilters.query)
                    return (
                      <a key={p} href={`/account?${pageParams}#author-products`} style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p === authorPagination.currentPage ? 'var(--accent)' : 'var(--border)'}`, background: p === authorPagination.currentPage ? 'var(--accent)' : 'var(--bg2)', color: p === authorPagination.currentPage ? '#fff' : 'var(--muted)', fontSize: '13px', fontWeight: p === authorPagination.currentPage ? 700 : 400, textDecoration: 'none' }}>{p}</a>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Загрузить ── */}
          {activeTab === 'author-upload' && user.isAuthor && (
            <div style={{ maxWidth: '580px' }}>
              <SectionTitle>Загрузить новую модель</SectionTitle>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                <UploadProductForm />
              </div>
            </div>
          )}

          {/* ── Статистика автора ── */}
          {activeTab === 'author-stats' && user.isAuthor && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Статистика автора</div>

              {stats ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { icon: 'ti-currency-rubel', label: 'Выручка',         value: `${stats.totalRevenue.toLocaleString('ru')} ₽`, accent: 'var(--success)', bg: 'rgba(29,158,117,0.1)', tab: 'author-sales' as Tab },
                      { icon: 'ti-shopping-bag',    label: 'Продаж',          value: stats.totalSales,                                accent: 'var(--accent)',  bg: 'rgba(72,128,255,0.1)', tab: 'author-sales' as Tab },
                      { icon: 'ti-file-3d',         label: 'Всего моделей',   value: stats.totalProducts,                             accent: 'var(--accent)',  bg: 'rgba(72,128,255,0.1)', tab: 'author-products' as Tab },
                      { icon: 'ti-eye',             label: 'Опубликовано',    value: stats.publishedCount,                            accent: 'var(--accent)',  bg: 'rgba(72,128,255,0.1)', tab: 'author-products' as Tab },
                    ].map(s => (
                      <div key={s.label} onClick={() => s.tab && setActiveTab(s.tab)} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderLeft: `3px solid ${s.accent}`, borderRadius: '16px',
                        padding: '20px 22px', boxShadow: 'var(--shadow-rest)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                        cursor: s.tab ? 'pointer' : 'default',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }} className={s.tab ? 'stat-card sales-card' : 'sales-card'}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
                          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{s.value}</div>
                        </div>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${s.icon}`} style={{ fontSize: '22px', color: s.accent }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Скачивания — отдельно, так как это не денежная метрика */}
                  <div style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '14px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    boxShadow: 'var(--shadow-rest)',
                  }} className="content-card sales-card">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(72,128,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-download" style={{ fontSize: '17px', color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{stats.totalDownloads.toLocaleString('ru')} скачиваний за всё время</div>
                    </div>
                  </div>

                  {/* Топ моделей */}
                  {authorTopProducts && (authorTopProducts.bySales.length > 0 || authorTopProducts.byDownloads.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {[
                        { title: 'Топ по продажам',    list: authorTopProducts.bySales,      icon: 'ti-shopping-bag', accent: 'var(--accent)' },
                        { title: 'Топ по скачиваниям', list: authorTopProducts.byDownloads,  icon: 'ti-download',     accent: '#F59E0B' },
                      ].map(col => (
                        <div key={col.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className={`ti ${col.icon}`} style={{ fontSize: '15px', color: col.accent }} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{col.title}</span>
                          </div>
                          {col.list.filter(p => p.value > 0).length === 0 ? (
                            <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>Нет данных</div>
                          ) : col.list.filter(p => p.value > 0).map((p, i) => (
                            <Link key={p.id} href={`/product/${p.id}?from=author-stats`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderBottom: i < col.list.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }} className="top-product-row">
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', width: '16px', flexShrink: 0 }}>{i + 1}</span>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: p.previewBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', overflow: 'hidden' }}>
                                {p.images && p.images.length > 0 ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.previewEmoji}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: col.accent, flexShrink: 0 }}>{p.value}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Заглушка детальной аналитики — честная, без фейкового графика */}
                  <div style={{
                    background: 'var(--bg2)', border: '1px dashed var(--border)',
                    borderRadius: '14px', padding: '28px 20px',
                    textAlign: 'center',
                  }}>
                    <i className="ti ti-chart-bar" style={{ fontSize: '28px', color: 'var(--muted)', opacity: 0.4, display: 'block', marginBottom: '10px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Детальная аналитика в разработке</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Графики продаж по дням появятся в следующей версии</div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── Продажи (полный список) ── */}
          {activeTab === 'author-sales' && user.isAuthor && (
            <div id="author-sales">
              <button onClick={() => setActiveTab(returnTab)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }} className="back-link">
                <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
                Назад
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Продажи</div>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{stats?.totalSales ?? 0} продаж · {stats?.totalRevenue.toLocaleString('ru') ?? 0} ₽</span>
              </div>

              {authorSales.length === 0 ? (
                <EmptyState icon="ti-receipt" title="Продаж пока нет" sub="Как только кто-то купит вашу модель, она появится здесь" />
              ) : (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-rest)' }} className="content-card sales-card">
                  {authorSales.map((sale, i) => (
                    <div key={sale.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < authorSales.length - 1 ? '1px solid var(--border)' : 'none' }} className="sale-row">
                      <Link href={`/product/${sale.product.id}?from=author-sales`} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: sale.product.previewBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden' }}>
                          {sale.product.images && sale.product.images.length > 0 ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${sale.product.images[0]}`} alt={sale.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sale.product.previewEmoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.product.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Купил: {sale.buyerName} · {new Date(sale.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                      </Link>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)', flexShrink: 0 }}>+{sale.price.toLocaleString('ru')} ₽</span>
                    </div>
                  ))}
                </div>
              )}

              {authorSalesPagination && authorSalesPagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
                  {Array.from({ length: authorSalesPagination.totalPages }, (_, i) => i + 1).map(p => (
                    <a key={p} href={`/account?tab=author-sales&salesPage=${p}#author-sales`} style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p === authorSalesPagination.currentPage ? 'var(--accent)' : 'var(--border)'}`, background: p === authorSalesPagination.currentPage ? 'var(--accent)' : 'var(--bg2)', color: p === authorSalesPagination.currentPage ? '#fff' : 'var(--muted)', fontSize: '13px', fontWeight: p === authorSalesPagination.currentPage ? 700 : 400, textDecoration: 'none' }}>{p}</a>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
        </div>
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />

      <style>{`
        /* ── Корневой layout ── */
        .account-root {
          min-height: calc(100vh - 64px);
          background: var(--bg);
        }

        /* Контейнер как navbar */
        .account-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px;
          display: flex;
          align-items: flex-start;
          gap: 32px;
        }

        /* ── Сайдбар — sticky ── */
        .account-sidebar {
          width: 210px;
          flex-shrink: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          padding: 36px 0 20px;
          overflow-x: hidden;
          overflow-y: auto;
          box-sizing: border-box;
          position: sticky;
          top: 0;
          max-height: calc(100vh - 64px);
          min-height: calc(100vh - 64px);
        }

        /* Контент */
        .account-main {
          flex: 1;
          min-width: 0;
          padding: 28px 0 64px;
        }

        /* Аватар */
        .sidebar-avatar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8px 14px 4px;
          margin-bottom: 8px;
          gap: 10px;
        }
        .sidebar-avatar-label {
          cursor: pointer;
          flex-shrink: 0;
        }
        .sidebar-avatar-img {
          width: 84px; height: 84px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 700;
          position: relative; overflow: hidden;
          transition: opacity 0.18s;
          box-shadow: 0 4px 16px rgba(72,128,255,0.3);
        }
        .sidebar-avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.18s;
          border-radius: 50%;
        }
        .sidebar-avatar-label:hover .sidebar-avatar-overlay { opacity: 1; }
        .avatar-delete-btn:hover { color: #E24B4A !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
        .sidebar-user-name {
          font-size: 14px; font-weight: 700; color: var(--text);
          text-align: center; line-height: 1.3;
        }
        .sidebar-user-email {
          font-size: 11px; color: var(--muted);
          text-align: center; margin-top: -6px;
        }

        /* Разделитель */
        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 14px;
        }

        /* Метка секции */
        .sidebar-section-label {
          padding: 20px 12px 8px;
          margin-top: 8px;
          border-top: 1px solid var(--border);
          font-size: 11px; font-weight: 700;
          color: var(--accent);
          text-transform: uppercase; letter-spacing: 0.08em;
          white-space: nowrap;
        }

        /* Навигация */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 4px 8px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
        }
        .sidebar-nav-btn {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: none; border: none;
          border-radius: 10px;
          color: var(--muted);
          font-size: 13px; font-weight: 400;
          cursor: pointer; text-align: left;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .sidebar-nav-btn:hover { background: rgba(72,128,255,0.06); color: var(--text); }
        .sidebar-nav-btn.active {
          background: rgba(72,128,255,0.09);
          color: var(--accent);
          font-weight: 600;
        }
        .sidebar-nav-btn.active i { color: var(--accent) !important; }
        .sidebar-nav-btn.author-item { color: var(--muted); }
        .sidebar-nav-btn.author-item:hover { color: var(--text); }
        .sidebar-nav-btn.author-item.active { color: var(--accent); }

        .sidebar-nav-label { overflow: hidden; text-overflow: ellipsis; }

        .sidebar-badge {
          margin-left: auto;
          background: rgba(72,128,255,0.12);
          color: var(--accent);
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 10px;
          flex-shrink: 0;
        }
        .sidebar-badge--danger {
          background: var(--danger);
          color: #fff;
        }

        /* Выйти */
        .sidebar-signout {
          display: flex; align-items: center; gap: 10px;
          width: 100%;
          padding: 9px 12px;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--muted);
          font-size: 13px; font-weight: 400;
          cursor: pointer; text-align: left;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .sidebar-signout:hover { background: rgba(226,75,74,0.08); color: #E24B4A; }

        /* ── Вспомогательные ── */
        .order-item-link:hover    { background: rgba(72,128,255,0.05) !important; }
        .dark .order-item-link:hover { background: rgba(72,128,255,0.08) !important; }
        .profile-action-row:hover { background: rgba(72,128,255,0.05) !important; }
        .dark .profile-action-row:hover { background: rgba(72,128,255,0.08) !important; }
        .purchase-row:hover       { background: rgba(72,128,255,0.05) !important; }
        .dark .purchase-row:hover { background: rgba(72,128,255,0.08) !important; }
        .sale-row                 { transition: background 0.15s; }
        .dark .sales-card         { background: #2C2D40 !important; border-top-color: rgba(255,255,255,0.12) !important; border-right-color: rgba(255,255,255,0.12) !important; border-bottom-color: rgba(255,255,255,0.12) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important; }
        .sale-row:hover           { background: rgba(72,128,255,0.05) !important; }
        .dark .sale-row:hover     { background: rgba(72,128,255,0.08) !important; }
        .dl-btn:hover             { border-color: var(--accent) !important; color: var(--accent) !important; }
        .model-row:hover          { background: rgba(72,128,255,0.05) !important; }
        .dark .model-row:hover     { background: rgba(72,128,255,0.08) !important; }
        .top-product-row:hover    { background: rgba(72,128,255,0.05) !important; }
        .model-action-btn:hover   { border-color: var(--accent) !important; color: var(--accent) !important; }
        .model-edit-btn:hover     { background: var(--accent) !important; border-color: var(--accent) !important; color: #fff !important; box-shadow: 0 4px 12px rgba(72,128,255,0.35); transform: translateY(-1px); }
        .fav-card           { transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
        .fav-card:hover           { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(72,128,255,0.15) !important; border-color: var(--accent) !important; }
        .dark .fav-card:hover     { box-shadow: 0 8px 20px rgba(72,128,255,0.2) !important; }
        .purchase-row             { transition: background 0.15s; }
        .model-row                { transition: background 0.15s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover) !important; }
        .author-stat-cell:hover   { background: rgba(72,128,255,0.05) !important; }
        .dark .author-stat-cell:hover { background: rgba(72,128,255,0.08) !important; }
        .author-follow-link:hover  { border-color: var(--accent) !important; color: var(--accent) !important; }
        .back-link:hover { color: var(--accent) !important; }
        .author-card-inner {
          background: #fff;
          border: 1.5px solid #e8eaed;
          border-radius: 16px;
          padding: 20px 12px 16px;
          display: flex; flex-direction: column; align-items: center;
          transition: all .18s;
          text-align: center;
        }
        .author-card-inner:hover {
          border-color: var(--accent);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(72,128,255,0.12);
        }
        .dark .author-card-inner {
          background: #1a1d2e;
          border-color: rgba(255,255,255,0.1);
        }
        .dark .author-card-inner:hover {
          border-color: rgba(72,128,255,0.5);
          box-shadow: 0 8px 24px rgba(72,128,255,0.15);
        }
        .sub-search { background: #fff !important; }
        .dark .sub-search { background: #1a1d2e !important; }
        .sub-search:focus          { border-color: var(--accent) !important; }
        .signout-btn:hover         { background: rgba(226,75,74,0.06) !important; }

        /* Карточки контента */
        .content-card { background: #fff !important; }
        .dark .content-card {
          background: #13151f !important;
          border-color: rgba(255,255,255,0.08) !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3) !important;
        }

        @media (max-width: 768px) {
          .account-container { padding: 0 16px; flex-direction: column; }
          .account-sidebar { display: none; }
          .account-main { padding: 16px 0; }
        }
        @media (min-width: 769px) { .bottom-spacer { display: none; } }
      `}</style>
    </div>
  )
}
