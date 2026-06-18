'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, string> = {
  author_application_approved: 'ti-user-check',
  author_application_rejected: 'ti-user-x',
  product_approved:            'ti-circle-check',
  product_rejected:            'ti-circle-x',
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1)  return 'сейчас'
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr} ч назад`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} дн назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false)
  const [items,         setItems]         = useState<NotificationItem[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loaded,        setLoaded]        = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const router  = useRouter()

  async function load() {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const data = await res.json()
      setItems(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // тихо игнорируем — колокольчик не критичен для остального интерфейса
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 20000)
    function onFocus() { load() }
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await fetch('/api/notifications/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  async function handleClick(n: NotificationItem) {
    if (!n.isRead) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
      fetch('/api/notifications/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Уведомления"
        className="nav-icon-btn"
        style={{ position: 'relative', border: 'none', background: 'none', cursor: 'pointer' }}
      >
        <i className="ti ti-bell" style={{ fontSize: '18px' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            minWidth: '15px', height: '15px', padding: '0 3px', borderRadius: '8px',
            background: 'var(--danger)', color: '#fff',
            fontSize: '10px', fontWeight: 700, lineHeight: '15px', textAlign: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '340px', maxHeight: '420px', overflowY: 'auto',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '14px', boxShadow: 'var(--shadow-hover)',
          zIndex: 300,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Уведомления</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, padding: 0 }}>
                Прочитать все
              </button>
            )}
          </div>

          {!loaded ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Загрузка...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              <i className="ti ti-bell-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
              Пока нет уведомлений
            </div>
          ) : (
            items.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
                  padding: '12px 16px', textAlign: 'left',
                  background: n.isRead ? 'transparent' : 'rgba(72,128,255,0.06)',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <i className={`ti ${TYPE_ICON[n.type] ?? 'ti-bell'}`} style={{ fontSize: '17px', color: n.type.includes('rejected') ? 'var(--danger)' : 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: n.isRead ? 500 : 700, color: 'var(--text)', marginBottom: '3px' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.isRead && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '5px' }} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
