'use client'

import Link from 'next/link'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/revset_icon.svg" alt="REVSET" style={{ width: '28px', height: '28px' }} />
          <span><span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span></span>
        </Link>

        {/* Ссылки — десктоп */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/catalog"     className="nav-link">Каталог</Link>
          <Link href="/for-authors" className="nav-link">Авторам</Link>
          <Link href="/blog"        className="nav-link">Блог</Link>
        </div>

        {/* Правая часть */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <button aria-label="Поиск"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <i className="ti ti-search" style={{ fontSize: '18px' }} />
          </button>
          <button aria-label="Избранное"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <i className="ti ti-heart" style={{ fontSize: '18px' }} />
          </button>

          {/* Переключатель темы */}
          <ThemeToggle />

          {/* Войти — десктоп */}
          <Link href="/login" className="nav-links-desktop"
            style={{
              background: 'var(--accent)', color: '#fff',
              padding: '8px 18px', borderRadius: '6px',
              fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
            Войти
          </Link>

          {/* Бургер — мобиль */}
          <button
            aria-label="Меню"
            onClick={() => setMenuOpen(o => !o)}
            className="burger-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'none' }}>
            <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} style={{ fontSize: '22px' }} />
          </button>
        </div>
      </nav>

      {/* Мобильное меню */}
      {menuOpen && (
        <div style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 20px 20px',
        }}>
          <Link href="/catalog"     className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Каталог</Link>
          <Link href="/for-authors" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Авторам</Link>
          <Link href="/blog"        className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Блог</Link>
          <Link href="/login"
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'block', marginTop: '12px',
              background: 'var(--accent)', color: '#fff',
              padding: '10px 0', borderRadius: '8px',
              fontSize: '14px', fontWeight: 700, textAlign: 'center',
            }}>
            Войти
          </Link>
        </div>
      )}

      {/* Нижнее меню — мобиль */}
      <nav className="bottom-nav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        zIndex: 100, padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { href: '/',          icon: 'ti-home',  label: 'Главная'   },
            { href: '/catalog',   icon: 'ti-books', label: 'Каталог'   },
            { href: '/favorites', icon: 'ti-heart', label: 'Избранное' },
            { href: '/account',   icon: 'ti-user',  label: 'Профиль'   },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '3px', color: 'var(--muted)', fontSize: '10px',
              fontWeight: 500, padding: '4px 0',
            }}>
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
        .mobile-nav-link {
          display: block;
          padding: 10px 0;
          font-size: 15px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }
        .nav-link {
          color: var(--muted);
          font-size: 13px;
          transition: color .2s;
          text-decoration: none;
        }
        .nav-link:hover { color: var(--text); }
      `}</style>
    </>
  )
}
