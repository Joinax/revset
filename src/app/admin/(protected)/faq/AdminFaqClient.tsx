'use client'

// src/app/admin/faq/AdminFaqClient.tsx
import { useState } from 'react'
import { TICKET_CATEGORIES } from '@/lib/ticket-categories'

type FaqArticle = {
  id:          string
  question:    string
  answer:      string
  category:    string | null
  position:    number
  isPublished: boolean
  helpfulYes:  number
  helpfulNo:   number
  createdAt:   string
  updatedAt:   string
}

type FormData = {
  question:    string
  answer:      string
  category:    string
  position:    string
  isPublished: boolean
}

const EMPTY_FORM: FormData = {
  question:    '',
  answer:      '',
  category:    '',
  position:    '0',
  isPublished: true,
}

const CATEGORIES = Object.entries(TICKET_CATEGORIES).map(([key, val]) => ({
  key,
  label: val.label,
}))

function getCategoryLabel(cat: string | null): string {
  if (!cat) return '—'
  return (TICKET_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat
}

type Props = {
  initialArticles: FaqArticle[]
}

export default function AdminFaqClient({ initialArticles }: Props) {
  const [articles, setArticles]   = useState<FaqArticle[]>(initialArticles)
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]           = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(a: FaqArticle) {
    setEditingId(a.id)
    setForm({
      question:    a.question,
      answer:      a.answer,
      category:    a.category ?? '',
      position:    String(a.position),
      isPublished: a.isPublished,
    })
    setError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSave() {
    setError('')
    const body = {
      question:    form.question.trim(),
      answer:      form.answer.trim(),
      category:    form.category || undefined,
      position:    parseInt(form.position, 10) || 0,
      isPublished: form.isPublished,
    }

    if (body.question.length < 3) { setError('Минимум 3 символа в вопросе'); return }
    if (body.answer.length < 3)   { setError('Минимум 3 символа в ответе'); return }

    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/faq/${editingId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Ошибка'); return }
        setArticles(prev => prev.map(a => a.id === editingId ? { ...a, ...data } : a))
      } else {
        const res = await fetch('/api/admin/faq', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Ошибка'); return }
        setArticles(prev => [data, ...prev])
      }
      cancelForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublished(a: FaqArticle) {
    setTogglingId(a.id)
    try {
      const res = await fetch(`/api/admin/faq/${a.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isPublished: !a.isPublished }),
      })
      if (res.ok) {
        const data = await res.json()
        setArticles(prev => prev.map(x => x.id === a.id ? { ...x, isPublished: data.isPublished } : x))
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить статью FAQ?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id))
        if (editingId === id) cancelForm()
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1100px', color: 'var(--admin-text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--admin-text)' }}>
            FAQ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--admin-muted)', margin: 0 }}>
            {articles.length} статей · {articles.filter(a => a.isPublished).length} опубликовано
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--admin-accent)', color: '#fff',
            border: 'none', borderRadius: '8px', padding: '9px 16px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: '15px' }} />
          Новая статья
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{
          background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: 'var(--admin-text)' }}>
            {editingId ? 'Редактировать статью' : 'Новая статья'}
          </h3>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--admin-muted)' }}>
                Вопрос *
              </label>
              <textarea
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="Текст вопроса..."
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
                  borderRadius: '8px', padding: '9px 12px',
                  color: 'var(--admin-text)', fontSize: '13px', outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--admin-muted)' }}>
                Ответ *
              </label>
              <textarea
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="Текст ответа..."
                rows={5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
                  borderRadius: '8px', padding: '9px 12px',
                  color: 'var(--admin-text)', fontSize: '13px', outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--admin-muted)' }}>
                  Категория
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{
                    width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
                    borderRadius: '8px', padding: '9px 12px',
                    color: 'var(--admin-text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                  }}
                >
                  <option value="">— Без категории —</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--admin-muted)' }}>
                  Позиция
                </label>
                <input
                  type="number"
                  value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                  min={0}
                  style={{
                    width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
                    borderRadius: '8px', padding: '9px 12px',
                    color: 'var(--admin-text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: 'var(--admin-text)', cursor: 'pointer', whiteSpace: 'nowrap',
                paddingBottom: '2px',
              }}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                />
                Опубликована
              </label>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--admin-danger)', margin: 0 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'var(--admin-accent)', color: '#fff',
                  border: 'none', borderRadius: '8px', padding: '9px 18px',
                  fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
                }}
              >
                {saving ? 'Сохранение...' : (editingId ? 'Сохранить' : 'Создать')}
              </button>
              <button
                onClick={cancelForm}
                style={{
                  background: 'var(--admin-bg)', color: 'var(--admin-muted)',
                  border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '9px 18px',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Articles table */}
      {articles.length === 0 ? (
        <div style={{
          background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
          borderRadius: '12px', padding: '48px', textAlign: 'center', color: 'var(--admin-muted)',
        }}>
          <i className="ti ti-help-circle" style={{ fontSize: '32px', opacity: 0.3, display: 'block', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', margin: 0 }}>Статей пока нет. Создайте первую.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 60px 90px 100px',
            gap: '12px', padding: '10px 16px',
            background: 'var(--admin-bg3, rgba(0,0,0,0.06))',
            borderBottom: '1px solid var(--admin-border)',
            fontSize: '11px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Вопрос</span>
            <span>Категория</span>
            <span style={{ textAlign: 'center' }}>Поз.</span>
            <span style={{ textAlign: 'center' }}>Статус</span>
            <span style={{ textAlign: 'right' }}>Действия</span>
          </div>

          {articles.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 60px 90px 100px',
                gap: '12px', padding: '12px 16px',
                borderBottom: i < articles.length - 1 ? '1px solid var(--admin-border)' : 'none',
                alignItems: 'center',
                background: editingId === a.id ? 'rgba(72,128,255,0.04)' : 'var(--admin-bg)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 500, color: 'var(--admin-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {a.question}
                </div>
                {a.helpfulYes + a.helpfulNo > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '2px' }}>
                    <i className="ti ti-thumb-up" style={{ fontSize: '11px' }} /> {a.helpfulYes} &nbsp;
                    <i className="ti ti-thumb-down" style={{ fontSize: '11px' }} /> {a.helpfulNo}
                  </div>
                )}
              </div>

              <span style={{ fontSize: '12px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getCategoryLabel(a.category)}
              </span>

              <span style={{ fontSize: '12px', color: 'var(--admin-muted)', textAlign: 'center' }}>
                {a.position}
              </span>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => handleTogglePublished(a)}
                  disabled={togglingId === a.id}
                  title={a.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                  style={{
                    background: a.isPublished ? 'rgba(29,158,117,0.12)' : 'rgba(0,0,0,0.06)',
                    color: a.isPublished ? '#1D9E75' : 'var(--admin-muted)',
                    border: 'none', borderRadius: '20px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    opacity: togglingId === a.id ? 0.5 : 1,
                  }}
                >
                  {a.isPublished ? 'Опубл.' : 'Скрыта'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => openEdit(a)}
                  title="Редактировать"
                  style={{
                    background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
                    borderRadius: '6px', padding: '5px 8px',
                    color: 'var(--admin-text)', cursor: 'pointer', lineHeight: 1,
                  }}
                >
                  <i className="ti ti-pencil" style={{ fontSize: '13px' }} />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  title="Удалить"
                  style={{
                    background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
                    borderRadius: '6px', padding: '5px 8px',
                    color: 'var(--admin-danger)', cursor: 'pointer', lineHeight: 1,
                    opacity: deletingId === a.id ? 0.5 : 1,
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
