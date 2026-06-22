'use client'
// src/app/admin/reviews/AdminReviewsClient.tsx

import { useState, useEffect, useTransition } from 'react'
import { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

const REJECT_REASONS = [
  'Содержит нецензурную лексику или оскорбления',
  'Не относится к товару',
  'Содержит спам или рекламу',
  'Содержит недостоверную информацию',
  'Нарушает правила платформы',
]

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'На модерации', color: 'var(--admin-warning)', bg: 'rgba(255,167,86,0.1)' },
  APPROVED: { label: 'Одобрен',      color: 'var(--admin-success)', bg: 'rgba(0,182,155,0.1)'  },
  REJECTED: { label: 'Отклонён',     color: 'var(--admin-danger)',  bg: 'rgba(239,56,38,0.1)'  },
}

type Review = {
  id:               string
  rating:           number
  text:             string | null
  moderationStatus: string
  createdAt:        string
  user:    { id: string; name: string | null; email: string }
  product: { id: string; name: string; previewEmoji: string; previewBg: string; images: string[] }
}

type Props = {
  reviews:       Review[]
  total:         number
  currentPage:   number
  perPage:       number
  currentStatus: string
  pendingCount:  number
}

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= rating ? '#F59E0B' : 'var(--admin-border)', fontSize: '14px' }}>★</span>
      ))}
    </span>
  )
}

export default function AdminReviewsClient({ reviews, total, currentPage, perPage, currentStatus, pendingCount: props_pendingCount }: Props) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const [isPending, startTransition] = useTransition()

  // Обновляем список при фокусе окна — как в верификации
  useEffect(() => {
    function onFocus() { router.refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  // Автообновление каждые 20 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20000)
    return () => clearInterval(interval)
  }, [router])
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

  const [loadingId,     setLoadingId]     = useState<string | null>(null)
  const [doneIds,       setDoneIds]       = useState<Set<string>>(new Set())
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({})
  const [showRejectForm, setShowRejectForm] = useState<Record<string, boolean>>({})
  const [pendingCount,  setPendingCount]  = useState(props_pendingCount)

  const totalPages = Math.ceil(total / perPage)

  async function handleAction(reviewId: string, action: 'approve' | 'reject') {
    setLoadingId(reviewId)
    try {
      const comment = rejectComment[reviewId] ?? ''
      const res = await fetch('/api/admin/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewId, action, moderationComment: comment }),
      })
      if (res.ok) {
        setDoneIds(prev => new Set([...prev, reviewId]))
        setShowRejectForm(prev => ({ ...prev, [reviewId]: false }))
        setPendingCount(c => Math.max(0, c - 1))
        mutate('/api/admin/reviews/count')
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  function setStatus(status: string) {
    startTransition(() => router.push(`/admin/reviews?status=${status}&page=1`))
  }

  function setPage(page: number) {
    router.push(`/admin/reviews?status=${currentStatus}&page=${page}`)
  }

  const statuses = [
    { key: 'PENDING',  label: 'На модерации', count: pendingCount },
    { key: 'APPROVED', label: 'Одобренные' },
    { key: 'REJECTED', label: 'Отклонённые' },
    { key: 'all',      label: 'Все' },
  ]

  return (
    <div style={{ padding: '32px', background: 'var(--admin-bg-page)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Отзывы</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-muted)', marginTop: '4px' }}>Модерация отзывов пользователей</p>
      </div>

      {/* Фильтры по статусу */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: currentStatus === s.key ? 'var(--admin-accent)' : 'var(--admin-bg)',
              color: currentStatus === s.key ? '#fff' : 'var(--admin-text)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span style={{
                background: currentStatus === s.key ? 'rgba(255,255,255,0.25)' : 'var(--admin-accent)',
                color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px',
              }}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Список отзывов */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {reviews.length === 0 ? (
          <div style={{
            background: 'var(--admin-bg)', borderRadius: 'var(--admin-radius)',
            border: '1px solid var(--admin-border)', padding: '48px',
            textAlign: 'center', color: 'var(--admin-muted)', fontSize: '14px',
          }}>
            Отзывов нет
          </div>
        ) : reviews.map(review => {
          const effectiveStatus = review.moderationStatus
          const statusStyle = STATUS_LABELS[effectiveStatus]
          const image = review.product.images[0]
          const isLoading = loadingId === review.id
          const isActioned = doneIds.has(review.id)

          return (
            <div key={review.id} style={{
              background: 'var(--admin-bg)', borderRadius: 'var(--admin-radius)',
              border: '1px solid var(--admin-border)', padding: '20px',
              opacity: isActioned ? 0.7 : 1, transition: 'opacity 0.2s',
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                {/* Превью товара */}
                <Link href={`/admin/families/${review.product.id}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden',
                    background: image ? '#f5f5f5' : review.product.previewBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {image
                      ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '24px' }}>{review.product.previewEmoji}</span>
                    }
                  </div>
                </Link>

                {/* Контент */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <Link href={`/admin/families/${review.product.id}`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text)', textDecoration: 'none' }}>
                        {review.product.name}
                      </Link>
                      <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>
                        <Link href={`/admin/users/${review.user.id}`} style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>
                          {review.user.name ?? review.user.email}
                        </Link>
                        {' · '}
                        {new Date(review.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stars rating={review.rating} />
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        color: statusStyle.color, background: statusStyle.bg,
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>

                  {review.text && (
                    <p style={{ fontSize: '13px', color: 'var(--admin-text)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      {review.text}
                    </p>
                  )}

                  {/* Кнопки модерации — только если ещё не обработан */}
                  {!isActioned && effectiveStatus === 'PENDING' && (
                    <div>
                      {showRejectForm[review.id] && (
                        <div style={{ marginBottom: '10px', background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '12px', display: 'grid', gap: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-muted)', marginBottom: '2px' }}>ПРИЧИНА ОТКЛОНЕНИЯ</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {REJECT_REASONS.map(reason => {
                              const isSelected = rejectComment[review.id] === reason
                              return (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setRejectComment(prev => ({
                                    ...prev,
                                    [review.id]: isSelected ? '' : reason,
                                  }))}
                                  style={{
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    background: isSelected ? 'rgba(239,56,38,0.12)' : 'var(--admin-bg)',
                                    border: `1px solid ${isSelected ? 'var(--admin-danger)' : 'var(--admin-border)'}`,
                                    color: isSelected ? 'var(--admin-danger)' : 'var(--admin-text)',
                                  }}
                                >
                                  {reason}
                                </button>
                              )
                            })}
                          </div>
                          <textarea
                            value={rejectComment[review.id] ?? ''}
                            onChange={e => setRejectComment(prev => ({ ...prev, [review.id]: e.target.value }))}
                            placeholder="Или напишите свою причину..."
                            rows={2}
                            style={{
                              width: '100%', background: 'var(--admin-bg)',
                              border: '1px solid var(--admin-border)', borderRadius: '8px',
                              padding: '8px 12px', color: 'var(--admin-text)', fontSize: '12px',
                              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleAction(review.id, 'approve')}
                          disabled={isLoading}
                          style={{
                            padding: '7px 16px', borderRadius: '8px', border: 'none',
                            background: 'var(--admin-success)', color: '#fff',
                            fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px',
                          }}
                        >
                          <i className="ti ti-check" style={{ fontSize: '13px' }} />
                          Одобрить
                        </button>
                        {!showRejectForm[review.id] ? (
                          <button
                            onClick={() => setShowRejectForm(prev => ({ ...prev, [review.id]: true }))}
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
                            onClick={() => handleAction(review.id, 'reject')}
                            disabled={isLoading}
                            style={{
                              padding: '7px 16px', borderRadius: '8px', border: 'none',
                              background: 'var(--admin-danger)', color: '#fff',
                              fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px',
                            }}
                          >
                            <i className="ti ti-x" style={{ fontSize: '13px' }} />
                            Подтвердить отклонение
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: p === currentPage ? 'var(--admin-accent)' : 'var(--admin-bg)',
                color: p === currentPage ? '#fff' : 'var(--admin-text)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${p === currentPage ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
