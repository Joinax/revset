'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { useAppSession } from './SessionProvider'
import { signOut } from '@/lib/auth-client'

export default function Navbar() {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { user, refresh } = useAppSession()
  const router = useRouter()

  // Фокус на поле поиска когда открывается
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  async function handleSignOut() {
    await signOut()
    await refresh()
    router.push('/')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  // Закрываем поиск по Escape
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/revset_icon.svg" alt="REVSET" style={{ width: '28px', height: '28px' }} />
          <span><span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span></span>
        </Link>

        {/* Строка поиска — раскрывается при нажатии */}
        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 16px' }}>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Поиск по моделям..."
              style={{
                flex: 1, background: 'var(--bg2)', border: '1px solid var(--accent)',
                borderRadius: '8px', padding: '8px 14px', color: 'var(--text)',
                fontSize: '14px', outline: 'none',
              }}
            />
            <button type="submit" style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Найти
            </button>
            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '20px', lineHeight: 1 }}>
              ×
            </button>
          </form>
        ) : (
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/catalog"     className="nav-link">Каталог</Link>
            <Link href="/for-authors" className="nav-link">Авторам</Link>
            <Link href="/blog"        className="nav-link">Блог</Link>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: searchOpen ? '0' : 'auto' }}>
          {/* Поиск */}
          {!searchOpen && (
            <button aria-label="Поиск" onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
              <i className="ti ti-search" style={{ fontSize: '18px' }} />
            </button>
          )}

          {/* Избранное — только если залогинен */}
          {user && (
            <Link href="/account#favorites" aria-label="Избранное"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', textDecoration: 'none' }}>
              <i className="ti ti-heart" style={{ fontSize: '18px' }} />
            </Link>
          )}

          <ThemeToggle />

          {user ? (
            <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/account" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                  {(user.name ?? user.email ?? 'U')[0].toUpperCase()}
                </span>
                <span>{user.name ?? user.email}</span>
              </Link>
              <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
                Выйти
              </button>
            </div>
          ) : (
            <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/login" style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
                Войти
              </Link>
              <Link href="/register" style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Регистрация
              </Link>
            </div>
          )}

          <button aria-label="Меню" onClick={() => setMenuOpen(o => !o)} className="burger-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'none' }}>
            <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} style={{ fontSize: '22px' }} />
          </button>
        </div>
      </nav>

      {/* Мобильное меню */}
      {menuOpen && (
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 20px 20px' }}>
          {/* Поиск в мобильном меню */}
          <form onSubmit={e => { handleSearch(e); setMenuOpen(false) }} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по моделям..."
              style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
            />
            <button type="submit" style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '9px 14px', color: '#fff', cursor: 'pointer' }}>
              <i className="ti ti-search" style={{ fontSize: '16px' }} />
            </button>
          </form>

          <Link href="/catalog"     className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Каталог</Link>
          <Link href="/for-authors" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Авторам</Link>
          <Link href="/blog"        className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Блог</Link>
          {user ? (
            <>
              <Link href="/account"    className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Личный кабинет</Link>
              <Link href="/account#favorites" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Избранное</Link>
              <button onClick={handleSignOut} style={{ display: 'block', width: '100%', marginTop: '12px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: '12px', background: 'var(--bg3)', color: 'var(--text)', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textAlign: 'center', border: '1px solid var(--border)' }}>
                Войти
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: '8px', background: 'var(--accent)', color: '#fff', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>
                Регистрация
              </Link>
            </>
          )}
        </div>
      )}

      {/* Нижнее меню — мобиль */}
      <nav className="bottom-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', zIndex: 100, padding: '8px 0 calc(8px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { href: '/',          icon: 'ti-home',  label: 'Главная'   },
            { href: '/catalog',   icon: 'ti-books', label: 'Каталог'   },
            { href: user ? '/account' : '/login', icon: 'ti-heart', label: 'Избранное' },
            { href: user ? '/account' : '/login', icon: 'ti-user',  label: user ? 'Кабинет' : 'Войти' },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: 'var(--muted)', fontSize: '10px', fontWeight: 500, padding: '4px 0' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: '22px' }} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <style>{`
        @media (max-width: 640px) {
          .nav-links-desktop { display: none !important; }
          .burger-btn        { display: flex !important; }
          .bottom-nav        { display: block !important; }
        }
        .mobile-nav-link { display: block; padding: 10px 0; font-size: 15px; color: var(--text); border-bottom: 1px solid var(--border); text-decoration: none; }
        .nav-link { color: var(--muted); font-size: 13px; transition: color .2s; text-decoration: none; }
        .nav-link:hover { color: var(--text); }
      `}</style>
    </>
  )
}
