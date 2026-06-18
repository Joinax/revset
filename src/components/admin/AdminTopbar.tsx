'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import { authClient } from '@/lib/auth-client'

type CurrentUser = { name: string; email: string } | null

export default function AdminTopbar({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const name  = currentUser?.name  ?? 'Admin'
  const email = currentUser?.email ?? ''
  const initial = name.charAt(0).toUpperCase()

  // Закрытие по клику снаружи
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header style={{
      height: '70px',
      background: 'var(--admin-bg)',
      borderBottom: '1px solid var(--admin-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--admin-bg2)',
          border: '1px solid var(--admin-border)',
          borderRadius: '10px',
          padding: '8px 14px', width: '220px',
          marginRight: '8px',
        }}>
          <i className="ti ti-search" style={{ fontSize: '15px', color: 'var(--admin-muted)' }} />
          <input
            type="text"
            placeholder="Поиск..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: '13px', color: 'var(--admin-text)', width: '100%',
            }}
          />
        </div>

        <ThemeToggle />

        {/* Notifications */}
        <button style={{
          position: 'relative', padding: '8px', borderRadius: '10px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--admin-muted)',
        }}>
          <i className="ti ti-bell" style={{ fontSize: '20px' }} />
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '8px', height: '8px',
            background: 'var(--admin-accent)', borderRadius: '50%',
          }} />
        </button>

        {/* Profile + dropdown */}
        <div ref={menuRef} style={{ position: 'relative', marginLeft: '4px' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: '10px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--admin-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '14px', fontWeight: 700, flexShrink: 0,
            }}>
              {initial}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', color: 'var(--admin-text)', fontWeight: 600, lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-muted)', lineHeight: 1.2 }}>Администратор</div>
            </div>
            <i className={`ti ti-chevron-down`} style={{ fontSize: '14px', color: 'var(--admin-muted)', marginLeft: '2px' }} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              minWidth: '220px',
              background: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: '12px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              zIndex: 200,
            }}>
              {/* Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{name}</div>
                {email && <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>{email}</div>}
              </div>

              {/* Links */}
              <Link href="/admin/settings" onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', fontSize: '13px', color: 'var(--admin-text)',
                textDecoration: 'none',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti ti-settings" style={{ fontSize: '16px', color: 'var(--admin-muted)' }} />
                Настройки платформы
              </Link>

              <Link href="/" target="_blank" onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', fontSize: '13px', color: 'var(--admin-text)',
                textDecoration: 'none',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti ti-external-link" style={{ fontSize: '16px', color: 'var(--admin-muted)' }} />
                Открыть сайт
              </Link>

              <div style={{ borderTop: '1px solid var(--admin-border)' }} />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', fontSize: '13px', color: 'var(--admin-danger)',
                  background: 'none', border: 'none', cursor: loggingOut ? 'default' : 'pointer',
                  opacity: loggingOut ? 0.6 : 1, textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,56,38,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti ti-logout" style={{ fontSize: '16px' }} />
                {loggingOut ? 'Выход...' : 'Выйти'}
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
