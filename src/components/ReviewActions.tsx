'use client'
// src/components/ReviewActions.tsx

import { useState, useEffect } from 'react'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Comment = {
  id: string
  text: string
  moderationStatus: string
  moderationComment?: string | null
  author: { name: string | null; image: string | null }
}

type Props = {
  reviewId:           string
  isProductAuthor:    boolean
  isLiked:            boolean
  likesCount:         number
  comment:            Comment | null
  currentUserId:      string | null | undefined
  productAuthorId:    string
  productAuthorName:  string | null
  productAuthorImage: string | null
}

export default function ReviewActions({
  reviewId, isProductAuthor, isLiked: initialLiked,
  comment, currentUserId, productAuthorId,
  productAuthorName, productAuthorImage,
}: Props) {
  useEffect(() => {
    setLocalComment(comment)
  }, [comment?.id, comment?.moderationStatus])

  const [liked,        setLiked]        = useState(initialLiked)
  const [likeLoading,  setLikeLoading]  = useState(false)
  const [showForm,     setShowForm]     = useState(false)
  const [showComment,  setShowComment]  = useState(false)
  const [commentText,  setCommentText]  = useState(comment?.moderationStatus === 'REJECTED' ? (comment.text ?? '') : '')
  const [submitting,   setSubmitting]   = useState(false)
  const [localComment, setLocalComment] = useState<Comment | null>(comment)

  async function handleLike() {
    if (!isProductAuthor || likeLoading) return
    setLikeLoading(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
      }
    } finally {
      setLikeLoading(false)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/comment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: commentText }),
      })
      if (res.ok) {
        setShowForm(false)
        setLocalComment({
          id: 'pending',
          text: commentText.trim(),
          moderationStatus: 'PENDING',
          author: { name: productAuthorName, image: productAuthorImage },
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const hasApprovedComment = localComment?.moderationStatus === 'APPROVED'
  const hasPendingComment  = localComment?.moderationStatus === 'PENDING'
  const hasRejectedComment = localComment?.moderationStatus === 'REJECTED'

  return (
    <div style={{ marginTop: '8px' }}>

      {/* Строка действий */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Лайк — аватарка автора с красным сердечком как на YouTube */}
        {(isProductAuthor || liked) && (
          <button
            onClick={handleLike}
            disabled={!isProductAuthor || likeLoading}
            title={isProductAuthor ? (liked ? 'Убрать лайк' : 'Понравился отзыв') : undefined}
            style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: isProductAuthor ? 'pointer' : 'default',
              padding: '2px', opacity: likeLoading ? 0.6 : 1,
              transition: 'opacity 0.15s, transform 0.1s',
              transform: likeLoading ? 'scale(0.9)' : 'scale(1)',
            }}
          >
            {/* Аватарка автора */}
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: productAuthorImage ? '#fff' : 'rgba(72,128,255,0.15)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: liked ? 1 : 0.4,
            }}>
              {productAuthorImage
                ? <img src={productAuthorImage.startsWith('http') ? productAuthorImage : `${S3_ENDPOINT}/${S3_BUCKET}/${productAuthorImage}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)' }}>
                    {(productAuthorName ?? 'A')[0].toUpperCase()}
                  </span>
              }
            </div>
            {/* Красное сердечко поверх аватарки — как на YouTube */}
            <i
              className="ti ti-heart-filled"
              style={{
                position: 'absolute', bottom: '0px', right: '0px',
                fontSize: '13px',
                color: liked ? '#FF0000' : '#bbb',
                transition: 'color 0.2s',
                WebkitTextStroke: '1px var(--bg)',
              }}
            />
          </button>
        )}

        {/* Кнопка Ответить — только для автора без комментария или с отклонённым */}
        {isProductAuthor && !showForm && (!localComment || hasRejectedComment) && (
          <button
            onClick={() => { setShowForm(true); if (hasRejectedComment) setCommentText(localComment?.text ?? '') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--muted)', padding: '2px 0',
              transition: 'color 0.15s',
            }}
          >
            <i className="ti ti-message-reply" style={{ marginRight: '3px', fontSize: '13px' }} />
            {hasRejectedComment ? 'Редактировать ответ' : 'Ответить'}
          </button>
        )}

        {/* Кнопка раскрытия ответа — видна всем если есть одобренный ответ */}
        {hasApprovedComment && localComment && (
          <button
            onClick={() => setShowComment(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--accent)', padding: '2px 0',
              display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'color 0.15s',
            }}
          >
            <i className={`ti ${showComment ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '13px' }} />
            {showComment ? 'Скрыть ответ' : 'Ответ автора'}
          </button>
        )}

        {/* На модерации — только автор видит */}
        {hasPendingComment && isProductAuthor && (
          <span style={{ fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <i className="ti ti-clock" style={{ fontSize: '12px' }} />
            Ответ на модерации
          </span>
        )}
      </div>

      {/* Форма ответа */}
      {showForm && (
        <form onSubmit={handleSubmitComment} style={{ marginTop: '10px' }}>
          {hasRejectedComment && localComment?.moderationComment && (
            <div style={{ marginBottom: '8px', padding: '8px 12px', background: 'rgba(226,75,74,0.06)', border: '1px solid rgba(226,75,74,0.15)', borderRadius: '6px', fontSize: '11px', color: 'var(--danger)' }}>
              <i className="ti ti-alert-circle" style={{ marginRight: '4px' }} />
              Причина отклонения: {localComment.moderationComment}
            </div>
          )}
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Ваш ответ на отзыв..."
            rows={3}
            maxLength={1000}
            autoFocus
            style={{
              width: '100%', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: '8px',
              padding: '10px 14px', color: 'var(--text)', fontSize: '13px',
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              marginBottom: '8px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="submit" disabled={submitting || !commentText.trim()} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '7px 16px', fontSize: '12px',
              fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting || !commentText.trim() ? 0.6 : 1,
            }}>
              {submitting ? 'Отправляем...' : hasRejectedComment ? 'Отправить повторно' : 'Отправить'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setCommentText('') }} style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '7px 16px', fontSize: '12px',
              color: 'var(--muted)', cursor: 'pointer',
            }}>
              Отмена
            </button>
            <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 'auto' }}>
              {commentText.length}/1000
            </span>
          </div>
        </form>
      )}

      {/* Отклонённый ответ — только автор видит */}
      {hasRejectedComment && localComment && isProductAuthor && !showForm && (
        <div style={{
          marginTop: '8px', padding: '8px 12px',
          background: 'rgba(226,75,74,0.06)', border: '1px solid rgba(226,75,74,0.15)',
          borderRadius: '8px', fontSize: '12px',
        }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '4px' }}>
            <i className="ti ti-x" style={{ marginRight: '4px' }} />
            Ответ отклонён
            {localComment.moderationComment && ` · ${localComment.moderationComment}`}
          </div>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '12px', lineHeight: 1.4 }}>{localComment.text}</p>
        </div>
      )}

      {/* Одобренный ответ — сворачиваемый, виден всем */}
      {hasApprovedComment && localComment && showComment && (
        <div style={{
          marginTop: '8px', padding: '10px 14px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)', borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(72,128,255,0.1)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {localComment.author.image
                ? <img src={localComment.author.image.startsWith('http') ? localComment.author.image : `${S3_ENDPOINT}/${S3_BUCKET}/${localComment.author.image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="ti ti-user" style={{ fontSize: '11px', color: 'var(--accent)' }} />
              }
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
              {localComment.author.name ?? 'Автор'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
            {localComment.text}
          </p>
        </div>
      )}
    </div>
  )
}
