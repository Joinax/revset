'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'

type Review = {
  id: string
  rating: number
  text: string
  createdAt: string
  userName: string | null
  userEmail: string
  packId: string
  packName: string
}

type Props = {
  reviews: Review[]
  currentStatus: string
  pendingCount: number
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'На модерации', color: 'var(--admin-warning)', bg: 'rgba(255,167,86,0.1)' },
  APPROVED: { label: 'Одобрен',      color: 'var(--admin-success)', bg: 'rgba(0,182,155,0.1)'  },
  REJECTED: { label: 'Отклонён',     color: 'var(--admin-danger)',  bg: 'rgba(239,56,38,0.1)'  },
}

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= rating ? '#F59E0B' : 'var(--admin-border)', fontSize: '13px' }}>★</span>
      ))}
    </span>
  )
}

export default function AdminPackReviewsClient({ reviews, currentStatus, pendingCount }: Props) {
  const router  = useRouter()
  const path    = usePathname()
  const [isPending, start] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [doneIds,   setDoneIds]   = useState<Set<string>>(new Set())
  const [comments,  setComments]  = useState<Record<string, string>>({})
  const [error,     setError]     = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState<Record<string, boolean>>({})

  const TABS = [
    { value: 'PENDING',  label: 'На модерации', count: pendingCount },
    { value: 'APPROVED', label: 'Одобрены',     count: null },
    { value: 'REJECTED', label: 'Отклонены',    count: null },
  ]

  async function handleAction(reviewId: string, action: 'approve' | 'reject') {
    setLoadingId(reviewId)
    setError(null)
    try {
      const res = await fetch('/api/admin/pack-reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          reviewId,
          action,
          moderationComment: comments[reviewId]?.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Ошибка сервера')
      } else {
        setDoneIds(prev => new Set([...prev, reviewId]))
        setShowRejectForm(prev => ({ ...prev, [reviewId]: false }))
        router.refresh()
      }
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Отзывы на паки</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>Модерация отзывов покупателей</p>
      </div>

      {/* Status tabs */}
      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => start(() => router.push(`${path}?status=${tab.value}`))}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer',
                fontWeight: currentStatus === tab.value ? 700 : 400,
                background: currentStatus === tab.value ? 'var(--admin-bg)' : 'transparent',
                color: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
              }}
            >
              {tab.label}
              {tab.count != null && (
                <span style={{
                  marginLeft: '6px', fontSize: '11px', fontWeight: 700,
                  padding: '1px 7px', borderRadius: '20px',
                  background: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-border)',
                  color: currentStatus === tab.value ? '#fff' : 'var(--admin-muted)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: 'rgba(239,56,38,0.1)', border: '1px solid var(--admin-danger)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--admin-danger)' }}>
          {error}
        </div>
      )}

      {/* Reviews list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {reviews.length === 0 ? (
          <div style={{
            background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
            borderRadius: '14px', padding: '48px 20px',
            textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px',
          }}>
            Нет отзывов в этом статусе
          </div>
        ) : reviews.map(r => {
          const isLoading   = loadingId === r.id
          const isActioned  = doneIds.has(r.id)
          const statusStyle = STATUS_LABELS[currentStatus] ?? STATUS_LABELS.PENDING

          return (
            <div key={r.id} style={{
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderRadius: '14px', padding: '20px',
              opacity: isActioned ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '2px' }}>
                    {r.userName ?? r.userEmail}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <Stars rating={r.rating} />
                    <span style={{
                      padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      color: statusStyle.color, background: statusStyle.bg,
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '4px' }}>
                    На пак:{' '}
                    <Link href={`/admin/packs/${r.packId}`} style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>
                      {r.packName}
                    </Link>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--admin-muted)', flexShrink: 0 }}>
                  {new Date(r.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Review text */}
              <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--admin-text)', margin: '0 0 14px' }}>
                {r.text}
              </p>

              {/* Actions — only for PENDING, not already actioned */}
              {!isActioned && currentStatus === 'PENDING' && (
                <div>
                  {showRejectForm[r.id] && (
                    <div style={{
                      marginBottom: '10px', background: 'var(--admin-bg2)',
                      border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '12px',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-muted)', marginBottom: '6px' }}>
                        КОММЕНТАРИЙ ДЛЯ ПОЛЬЗОВАТЕЛЯ
                      </div>
                      <textarea
                        value={comments[r.id] ?? ''}
                        onChange={e => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Причина отклонения (необязательно)..."
                        rows={2}
                        style={{
                          width: '100%', background: 'var(--admin-bg)',
                          border: '1px solid var(--admin-border)', borderRadius: '8px',
                          padding: '8px 12px', color: 'var(--admin-text)', fontSize: '12px',
                          outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction(r.id, 'approve')}
                      disabled={isLoading}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', border: 'none',
                        background: 'var(--admin-success)', color: '#fff',
                        fontSize: '12px', fontWeight: 600,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <i className="ti ti-check" style={{ fontSize: '13px' }} />
                      Одобрить
                    </button>
                    {!showRejectForm[r.id] ? (
                      <button
                        onClick={() => setShowRejectForm(prev => ({ ...prev, [r.id]: true }))}
                        style={{
                          padding: '7px 16px', borderRadius: '8px', border: 'none',
                          background: 'var(--admin-danger)', color: '#fff',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        <i className="ti ti-x" style={{ fontSize: '13px' }} />
                        Отклонить
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(r.id, 'reject')}
                        disabled={isLoading}
                        style={{
                          padding: '7px 16px', borderRadius: '8px', border: 'none',
                          background: 'var(--admin-danger)', color: '#fff',
                          fontSize: '12px', fontWeight: 600,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.7 : 1,
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        <i className="ti ti-x" style={{ fontSize: '13px' }} />
                        Подтвердить отклонение
                      </button>
                    )}
                    {showRejectForm[r.id] && (
                      <button
                        onClick={() => setShowRejectForm(prev => ({ ...prev, [r.id]: false }))}
                        style={{
                          padding: '7px 12px', borderRadius: '8px',
                          border: '1px solid var(--admin-border)', background: 'transparent',
                          color: 'var(--admin-muted)', fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
