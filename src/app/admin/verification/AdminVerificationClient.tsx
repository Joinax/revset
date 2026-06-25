'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useVerificationCount } from '@/hooks/useVerificationCount'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const avatarSrc   = (img: string) => img.startsWith('http') ? img : `${S3_ENDPOINT}/${S3_BUCKET}/${img}`

type Author = {
  userId: string
  name: string
  email: string
  image: string | null
  bio: string | null
  city: string | null
  isVerified: boolean
  autoPublish: boolean
  totalSales: number
  totalRevenue: number
  productsCount: number
  registeredAt: string
  createdAt: string
}

type Props = {
  authors: Author[]
  pendingCount: number
  verifiedCount: number
  currentStatus: string
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(!checked) }} style={{
      width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
      background: checked ? 'var(--admin-accent)' : 'var(--admin-border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function AdminVerificationClient({ authors, pendingCount, verifiedCount, currentStatus }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { mutate: mutateVerificationCount } = useVerificationCount()
  const [autoPublishMap, setAutoPublishMap] = useState<Record<string, boolean>>(
    Object.fromEntries(authors.map(a => [a.userId, a.autoPublish]))
  )

  useEffect(() => {
    function onFocus() { router.refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20000)
    return () => clearInterval(interval)
  }, [router])

  function setStatus(status: string) {
    startTransition(() => router.push(`${pathname}?status=${status}`))
  }

  async function handleAction(e: React.MouseEvent, userId: string, action: 'approve' | 'reject') {
    e.preventDefault()
    e.stopPropagation()
    setLoadingId(userId)
    await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    })
    setLoadingId(null)
    // Инвалидируем кэш счётчика верификации — сайдбар обновится мгновенно,
    // на всех страницах, использующих этот SWR-ключ
    mutateVerificationCount()
    router.refresh()
  }

  async function handleAutoPublish(userId: string, value: boolean) {
    setAutoPublishMap(prev => ({ ...prev, [userId]: value }))
    await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'toggleAutoPublish', autoPublish: value }),
    })
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  const TABS = [
    { value: 'pending',  label: 'Ожидают',       count: pendingCount  },
    { value: 'verified', label: 'Верифицированы', count: verifiedCount },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .verify-card:hover { box-shadow: 0 4px 24px rgba(72,128,255,0.12) !important; border-color: var(--admin-accent) !important; }
        .verify-card { transition: box-shadow 0.2s, border-color 0.2s; }
        .role-tab { transition: all 0.15s; cursor: pointer; border: none; }
      `}</style>

      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Верификация авторов</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>Проверка заявок на статус автора</p>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab.value} className="role-tab"
              onClick={() => setStatus(tab.value)}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: currentStatus === tab.value ? 'var(--admin-bg)' : 'transparent',
                color: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
                boxShadow: currentStatus === tab.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              {tab.label}
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
                background: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-border)',
                color: currentStatus === tab.value ? '#fff' : 'var(--admin-muted)',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {authors.length === 0 ? (
        <div style={{
          background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
          borderRadius: '14px', padding: '48px 20px',
          textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px',
        }}>
          {currentStatus === 'pending' ? 'Нет заявок на верификацию' : 'Нет верифицированных авторов'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isPending ? 0.6 : 1 }}>
          {authors.map(author => (
            <Link key={author.userId} href={`/admin/users/${author.userId}?from=verification`} className="verify-card" style={{
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderRadius: '14px', padding: '20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              textDecoration: 'none', color: 'inherit', display: 'block',
            }}>
              {/* Top: avatar + info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                {author.image ? (
                  <img src={avatarSrc(author.image)} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'rgba(72,128,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                      {author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text)' }}>{author.name}</span>
                    {author.isVerified && (
                      <i className="ti ti-rosette-discount-check" style={{ color: 'var(--admin-accent)', fontSize: '16px' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '8px' }}>{author.email}</div>
                  {author.bio && (
                    <div style={{ fontSize: '13px', color: 'var(--admin-text)', marginBottom: '8px', opacity: 0.7 }}>{author.bio}</div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {author.city && (
                      <span style={{ fontSize: '12px', color: 'var(--admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="ti ti-map-pin" style={{ fontSize: '13px' }} />{author.city}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-box" style={{ fontSize: '13px' }} />{author.productsCount} семейств
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-shopping-cart" style={{ fontSize: '13px' }} />{author.totalSales} продаж
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-calendar" style={{ fontSize: '13px' }} />Зарегистрирован {formatDate(author.registeredAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: actions */}
              <div style={{
                paddingTop: '16px', borderTop: '1px solid var(--admin-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                {/* Auto-publish (только для верифицированных) */}
                {author.isVerified ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Toggle
                      checked={autoPublishMap[author.userId] ?? false}
                      onChange={v => handleAutoPublish(author.userId, v)}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>Авто-публикация</span>
                  </div>
                ) : (
                  <div />
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!author.isVerified ? (
                    <>
                      <button
                        onClick={e => handleAction(e, author.userId, 'approve')}
                        disabled={loadingId === author.userId}
                        style={{
                          padding: '8px 20px', borderRadius: '10px', border: 'none',
                          background: 'var(--admin-success)', color: '#fff',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          opacity: loadingId === author.userId ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                        <i className="ti ti-check" /> Подтвердить
                      </button>
                      <button
                        onClick={e => handleAction(e, author.userId, 'reject')}
                        disabled={loadingId === author.userId}
                        style={{
                          padding: '8px 20px', borderRadius: '10px',
                          border: '1px solid var(--admin-border)',
                          background: 'transparent', color: 'var(--admin-danger)',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          opacity: loadingId === author.userId ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                        <i className="ti ti-x" /> Отклонить
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={e => handleAction(e, author.userId, 'reject')}
                      disabled={loadingId === author.userId}
                      style={{
                        padding: '8px 20px', borderRadius: '10px',
                        border: '1px solid var(--admin-border)',
                        background: 'transparent', color: 'var(--admin-muted)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        opacity: loadingId === author.userId ? 0.6 : 1,
                      }}>
                      Снять верификацию
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
