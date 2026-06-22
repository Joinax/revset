// src/components/ReviewForm.tsx
'use client'

import { useState } from 'react'
import { useAppSession } from './SessionProvider'

type Review = {
  id: string; rating: number; text: string | null
  createdAt: string; user: { name: string | null }
}

type Props = {
  productId:   string
  isFree:      boolean
  isPurchased: boolean
  existingReviewStatus?: string | null
  onReviewAdded: (review: Review) => void
}

export default function ReviewForm({ productId, isFree, isPurchased, existingReviewStatus, onReviewAdded }: Props) {
  const { user } = useAppSession()
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Показываем форму только если залогинен и может оставить отзыв
  if (!user) {
    return (
      <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--accent)' }}>Войдите</a>, чтобы оставить отзыв
      </div>
    )
  }

  // Если отзыв одобрен или ждёт модерации — скрываем форму
  if (existingReviewStatus === 'APPROVED' || existingReviewStatus === 'PENDING') {
    return null
  }

  if (!isFree && !isPurchased) {
    return (
      <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
        Отзыв можно оставить только после покупки
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ padding: '16px', background: 'rgba(72,128,255,0.08)', border: '1px solid rgba(72,128,255,0.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--accent)', textAlign: 'center' }}>
        <i className="ti ti-clock" style={{ marginRight: '6px' }} />
        Отзыв отправлен на модерацию. Спасибо!
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Выберите оценку'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, rating, text }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка'); return }

      setSuccess(true)
      onReviewAdded(data)

    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      {existingReviewStatus === 'REJECTED' && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--danger)' }}>
          <i className="ti ti-alert-circle" style={{ marginRight: '5px' }} />
          Ваш предыдущий отзыв был отклонён. Вы можете исправить и отправить повторно.
        </div>
      )}
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Ваш отзыв</div>

      {/* Звёздочки */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star} type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '24px', padding: '0 2px',
              color: star <= (hover || rating) ? '#F59E0B' : 'var(--border)',
              transition: 'color 0.1s',
            }}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span style={{ fontSize: '13px', color: 'var(--muted)', alignSelf: 'center', marginLeft: '6px' }}>
            {['', 'Плохо', 'Неплохо', 'Хорошо', 'Отлично', 'Великолепно'][rating]}
          </span>
        )}
      </div>

      {/* Текст */}
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Расскажите о модели — качество деталей, совместимость с версиями Revit..."
        rows={3}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-manrope)', marginBottom: '10px' }}
      />

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '10px' }}>{error}</div>
      )}

      <button type="submit" disabled={loading}
        style={{ background: loading ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Публикуем...' : existingReviewStatus === 'REJECTED' ? 'Отправить повторно' : 'Опубликовать отзыв'}
      </button>
    </form>
  )
}
