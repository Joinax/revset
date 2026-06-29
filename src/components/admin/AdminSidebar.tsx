'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useVerificationCount } from '@/hooks/useVerificationCount'
import { useModerationCount } from '@/hooks/useModerationCount'
import { useReviewsCount } from '@/hooks/useReviewsCount'
import { useReviewCommentsCount } from '@/hooks/useReviewCommentsCount'
import { usePacksModerationCount } from '@/hooks/usePacksModerationCount'
import { useAdminEvents } from '@/hooks/useAdminEvents'

const links = [
  { href: '/admin/dashboard',    icon: 'ti-layout-dashboard', label: 'Дашборд' },
  { href: '/admin/families',     icon: 'ti-box',              label: 'Семейства' },
  { href: '/admin/packs',         icon: 'ti-package',          label: 'Паки' },
  { href: '/admin/pack-reviews', icon: 'ti-message-2',        label: 'Отзывы на паки' },
  { href: '/admin/users',        icon: 'ti-users',            label: 'Пользователи' },
  { href: '/admin/verification', icon: 'ti-shield-check',     label: 'Верификация' },
  { href: '/admin/transactions',    icon: 'ti-credit-card',    label: 'Транзакции' },
  { href: '/admin/reviews',          icon: 'ti-message-star',   label: 'Отзывы' },
  { href: '/admin/review-comments',  icon: 'ti-message-reply',  label: 'Ответы авторов' },
  { href: '/admin/logs',         icon: 'ti-history',          label: 'Журнал' },
  { href: '/admin/settings',     icon: 'ti-settings',         label: 'Настройки' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router    = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [hovered, setHovered]   = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useAdminEvents()

  const { count: verificationCount,    isLoading: vLoading }  = useVerificationCount()
  const { count: moderationCount,      isLoading: mLoading }  = useModerationCount()
  const { count: reviewsCount,         isLoading: rLoading }  = useReviewsCount()
  const { count: reviewCommentsCount,  isLoading: rcLoading } = useReviewCommentsCount()
  const { count: packsCount,           isLoading: pLoading }  = usePacksModerationCount()

  // Карта badge-счётчиков по href — легко добавлять новые в будущем
  const badgeCounts: Record<string, number> = {
    '/admin/verification':   verificationCount,
    '/admin/families':       moderationCount,
    '/admin/packs':          packsCount,
    '/admin/reviews':        reviewsCount,
    '/admin/review-comments': reviewCommentsCount,
  }

  // До первой загрузки SWR не показываем бейдж вообще —
  // иначе на долю секунды мигнёт "0" перед реальным значением
  const badgeLoading: Record<string, boolean> = {
    '/admin/verification':   vLoading,
    '/admin/families':       mLoading,
    '/admin/packs':          pLoading,
    '/admin/reviews':        rLoading,
    '/admin/review-comments': rcLoading,
  }

  const W = expanded ? 240 : 72

  async function handleLogout() {
    setLoggingOut(true)
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside style={{
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      width: `${W}px`,
      transition: 'width 0.25s ease',
      zIndex: 100,
      background: 'var(--admin-bg)',
      borderRight: '1px solid var(--admin-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        padding: '0 20px', marginBottom: '36px',
        display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: '10px', height: '36px',
      }}>
        <img src="/revset_icon.svg" alt="REVSET" style={{ width: '32px', height: '32px', flexShrink: 0 }} />
        {expanded && (
          <div style={{ whiteSpace: 'nowrap', lineHeight: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>
              <span style={{ color: 'var(--admin-accent)' }}>REV</span>
              <span style={{ color: 'var(--admin-text)' }}>SET</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', display: 'block', marginTop: '2px' }}>Admin</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 }}>
        {links.map(({ href, icon, label }) => {
          const active    = pathname.startsWith(href)
          const isHovered = hovered === href
          const badge     = badgeLoading[href] ? 0 : (badgeCounts[href] ?? 0)

          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              title={!expanded ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px', borderRadius: '10px', textDecoration: 'none',
                background: active ? 'var(--admin-accent)' : isHovered ? 'rgba(72,128,255,0.08)' : 'transparent',
                color: active ? '#fff' : isHovered ? 'var(--admin-accent)' : 'var(--admin-muted)',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                justifyContent: expanded ? 'flex-start' : 'center',
                position: 'relative',
              }}
            >
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${icon}`} style={{ fontSize: '20px' }} />

                {!expanded && badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-6px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: active ? '#fff' : 'var(--admin-danger)',
                    border: '1.5px solid var(--admin-bg)',
                  }} />
                )}
              </span>

              {expanded && (
                <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
              )}

              {expanded && badge > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  minWidth: '20px', height: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px', padding: '0 6px',
                  background: active ? 'rgba(255,255,255,0.25)' : 'var(--admin-danger)',
                  color: '#fff',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider + toggle + logout */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ borderTop: '1px solid var(--admin-border)', margin: '8px 0' }} />

        {/* Свернуть / Развернуть */}
        <button
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(72,128,255,0.08)'
            e.currentTarget.style.color = 'var(--admin-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--admin-muted)'
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px', borderRadius: '10px', width: '100%',
            color: 'var(--admin-muted)', background: 'transparent', border: 'none',
            cursor: 'pointer', transition: 'color 0.15s, background 0.15s',
            justifyContent: expanded ? 'flex-start' : 'center',
            marginBottom: '4px',
          }}>
          <i
            className={`ti ${expanded ? 'ti-layout-sidebar-left-collapse' : 'ti-layout-sidebar-left-expand'}`}
            style={{ fontSize: '20px', flexShrink: 0 }}
          />
          {expanded && <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Свернуть</span>}
        </button>

        {/* Выйти */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--admin-danger)'
            e.currentTarget.style.background = 'rgba(239,56,38,0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--admin-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px', borderRadius: '10px', width: '100%',
            color: 'var(--admin-muted)', background: 'none', border: 'none',
            cursor: loggingOut ? 'default' : 'pointer',
            opacity: loggingOut ? 0.6 : 1,
            transition: 'color 0.15s, background 0.15s',
            justifyContent: expanded ? 'flex-start' : 'center',
          }}>
          <i className="ti ti-logout" style={{ fontSize: '20px', flexShrink: 0 }} />
          {expanded && <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{loggingOut ? 'Выход...' : 'Выйти'}</span>}
        </button>
      </div>
    </aside>
  )
}
