'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import CartButton from './CartButton'
import { useAppSession } from './SessionProvider'
import { signOut } from '@/lib/auth-client'

export default function Navbar() {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, refresh } = useAppSession()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    await refresh()
    router.push('/')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <>
      <nav className="navbar">
        <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 48px', display: 'flex', alignItems: 'center', gap: '24px' }}>

          {/* Логотип */}
          <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img src="/revset_icon.svg" alt="REVSET" style={{ width: '32px', height: '32px' }} />
            <span style={{fontSize: '20px',}}><span style={{color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span></span>
          </Link>

          {/* Ссылки — десктоп */}
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <Link href="/catalog"     className="nav-link">Каталог</Link>
            <Link href="/for-authors" className="nav-link">Авторам</Link>
          </div>

          {/* Поиск — по центру, растягивается */}
          <form onSubmit={handleSearch} className="nav-search-form nav-links-desktop">
            <i className="ti ti-search" style={{ fontSize: '16px', color: 'var(--muted)', flexShrink: 0 }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск семейств для Revit..."
              className="nav-search-input"
            />
          </form>

          {/* Правая часть */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
            <ThemeToggle />

            {user ? (
              <>
                <CartButton />
                <Link href="/account#favorites" className="nav-icon-btn" aria-label="Избранное">
                  <i className="ti ti-heart" style={{ fontSize: '18px' }} />
                </Link>

                {/* Аватар + имя */}

                  <Link href="/account" style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg1)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '6px 12px',
                    fontSize: '13px', color: 'var(--text)', fontWeight: 500,
                    textDecoration: 'none',
                    }} className="nav-links-desktop">
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: user.image ? '#fff' : 'var(--accent)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {user.image
                        ? <img src={user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (user.name ?? user.email ?? 'U')[0].toUpperCase()
                      }
                    </span>
                    <span>{user.name ?? user.email}</span>
                  </Link>




              </>
            ) : (
              <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link href="/login" style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '7px 18px',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Войти
                </Link>
                <Link href="/register" style={{
                  background: 'var(--accent)', color: '#fff',
                  padding: '7px 18px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                  Регистрация
                </Link>
              </div>
            )}

            {/* Бургер — мобиль */}
            <button aria-label="Меню" onClick={() => setMenuOpen(o => !o)} className="burger-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'none' }}>
              <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} style={{ fontSize: '22px' }} />
            </button>
          </div>

        </div>
      </nav>

      {/* Мобильное меню */}
      {menuOpen && (
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 20px 20px' }}>
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
          {user ? (
            <>
              <Link href="/account"           className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Личный кабинет</Link>
              <Link href="/account#favorites" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Избранное</Link>
              <button onClick={handleSignOut} style={{ display: 'block', width: '100%', marginTop: '12px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login"    onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: '12px', background: 'var(--bg3)', color: 'var(--text)', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textAlign: 'center', border: '1px solid var(--border)' }}>Войти</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: '8px', background: 'var(--accent)', color: '#fff', padding: '10px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>Регистрация</Link>
            </>
          )}
        </div>
      )}

      {/* Нижнее меню — мобиль */}
      <nav className="bottom-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', zIndex: 100, padding: '8px 0 calc(8px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { href: '/',        icon: 'ti-home',  label: 'Главная'  },
            { href: '/catalog', icon: 'ti-books', label: 'Каталог'  },
            { href: user ? '/account#favorites' : '/login', icon: 'ti-heart', label: 'Избранное' },
            { href: user ? '/account' : '/login', icon: 'ti-user',  label: user ? 'Кабинет' : 'Войти' },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: 'var(--muted)', fontSize: '10px', fontWeight: 500, padding: '4px 0', textDecoration: 'none' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: '22px' }} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <style>{`
        .nav-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 14px;
          max-width: 360px;
          transition: border-color 0.15s;
        }
        .nav-search-form:focus-within {
          border-color: var(--accent);
        }
        .nav-search-input {
          flex: 1; border: none; outline: none;
          background: transparent; font-family: inherit;
          font-size: 13px; color: var(--text);
        }
        .nav-search-input::placeholder { color: var(--muted); }

        .nav-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          color: var(--text); text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .nav-icon-btn:hover { background: var(--bg2); color: var(--accent); }

        .nav-link { color: var(--text); font-size: 14px; font-weight: 500; transition: color 0.15s; text-decoration: none; }
        .nav-link:hover { color: var(--accent); }
        .nav-links-desktop:hover {border-color: var(--accent) !important; color: var(--accent) !important; }}

        .mobile-nav-link { display: block; padding: 10px 0; font-size: 15px; color: var(--text); border-bottom: 1px solid var(--border); text-decoration: none; }

        @media (max-width: 640px) {
          .nav-links-desktop { display: none !important; }
          .burger-btn        { display: flex !important; }
          .bottom-nav        { display: block !important; }
        }
      `}</style>
    </>
  )
}
