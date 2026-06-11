'use client'

import ThemeToggle from '@/components/ThemeToggle'

export default function AdminTopbar() {
  return (
    <header style={{
      height: '70px',
      background: 'var(--admin-bg)',
      borderBottom: '1px solid var(--admin-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--admin-bg2)',
        border: '1px solid var(--admin-border)',
        borderRadius: '10px',
        padding: '10px 14px', width: '280px',
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

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '4px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--admin-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '14px', fontWeight: 700,
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--admin-text)', fontWeight: 600, lineHeight: 1.2 }}>Admin</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-muted)', lineHeight: 1.2 }}>Администратор</div>
          </div>
        </div>
      </div>
    </header>
  )
}
