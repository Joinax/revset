'use client'
 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
 
const links = [
  { href: '/admin/dashboard',    icon: 'ti-layout-dashboard', label: 'Дашборд' },
  { href: '/admin/families',     icon: 'ti-box',              label: 'Семейства' },
  { href: '/admin/users',        icon: 'ti-users',            label: 'Пользователи' },
  { href: '/admin/verification', icon: 'ti-shield-check',     label: 'Верификация' },
  { href: '/admin/transactions', icon: 'ti-credit-card',      label: 'Транзакции' },
  { href: '/admin/settings',     icon: 'ti-settings',         label: 'Настройки' },
]
 
export default function AdminSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
 
  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? '240px' : '72px',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        height: '100vh',
        background: 'var(--admin-bg)',
        borderRight: '1px solid var(--admin-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 20px', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '10px', height: '36px' }}>
        <img src="/revset_icon.svg" alt="REVSET" style={{ width: '32px', height: '32px', flexShrink: 0 }} />
        {expanded && (
          <div style={{ whiteSpace: 'nowrap', lineHeight: 1 }}>
            <span style={{ fontSize: '20px', fontWeight: 800 }}><h3>
              <span style={{ color: 'var(--admin-accent)' }}>REV</span>
              <span style={{ color: 'var(--admin-text)' }}>SET</span>
            </h3>

            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginTop: '3px' }}>Admin</span>
          </div>
        )}
      </div>
 
      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 }}>
        {links.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href)
          const isHovered = hovered === href
          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 10px',
                borderRadius: '10px',
                textDecoration: 'none',
                background: active
                  ? 'var(--admin-accent)'
                  : isHovered
                  ? 'rgba(72,128,255,0.08)'
                  : 'transparent',
                color: active ? '#fff' : isHovered ? 'var(--admin-accent)' : 'var(--admin-muted)',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: '20px', flexShrink: 0 }} />
              {expanded && (
                <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400 }}>{label}</span>
              )}
            </Link>
          )
        })}
      </nav>
 
      {/* Logout */}
      <div style={{ padding: '0 12px' }}>
        <button
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--admin-danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--admin-muted)')}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 10px', borderRadius: '10px', width: '100%',
            color: 'var(--admin-muted)', background: 'none', border: 'none',
            cursor: 'pointer', transition: 'color 0.15s',
          }}>
          <i className="ti ti-logout" style={{ fontSize: '20px', flexShrink: 0 }} />
          {expanded && <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Выйти</span>}
        </button>
      </div>
    </aside>
  )
}