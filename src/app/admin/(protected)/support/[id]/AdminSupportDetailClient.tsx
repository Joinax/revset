'use client'

// src/app/admin/support/[id]/AdminSupportDetailClient.tsx
import { useState } from 'react'
import Link from 'next/link'
import { getCategoryLabel } from '@/lib/ticket-categories'

type Attachment = { id: string; fileKey: string; status: string; threat: string | null }

type Message = {
  id: string; text: string | null; isStaff: boolean; isInternal: boolean
  authorId: string; createdAt: string; attachments: Attachment[]
}

type Ticket = {
  id: string; number: number; subject: string; category: string
  priority: string; status: string; assignedTo: string | null
  createdAt: string; updatedAt: string
  userReadAt: string | null; staffReadAt: string | null
}

type Owner  = { id: string; name: string | null; email: string | null; image: string | null }
type Agent  = { id: string; name: string | null }
type CannedResponse = { id: string; title: string; text: string }

type Props = {
  ticket:          Ticket
  messages:        Message[]
  owner:           Owner | null
  agent:           Agent | null
  agentId:         string
  isAdmin:         boolean
  cannedResponses: CannedResponse[]
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#EF3826',
  HIGH:   '#F5883C',
  MEDIUM: '#4880FF',
  LOW:    '#B9B9C2',
}
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Срочно', HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий',
}
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  AWAITING_SUPPORT: { label: 'Ждёт поддержки',    color: 'var(--admin-muted)', bg: 'rgba(0,0,0,0.06)'      },
  AWAITING_USER:    { label: 'Ждёт пользователя', color: '#F59E0B',            bg: 'rgba(245,158,11,0.1)'  },
  CLOSED:           { label: 'Закрыт',             color: 'var(--admin-muted)', bg: 'rgba(0,0,0,0.06)'      },
}

export default function AdminSupportDetailClient({
  ticket: initialTicket,
  messages: initialMessages,
  owner,
  agent: initialAgent,
  agentId,
  isAdmin,
  cannedResponses,
}: Props) {
  const [ticket,   setTicket]   = useState(initialTicket)
  const [messages, setMessages] = useState(initialMessages)
  const [agent,    setAgent]    = useState(initialAgent)

  const [replyText,    setReplyText]    = useState('')
  const [isInternal,   setIsInternal]   = useState(false)
  const [sendLoading,  setSendLoading]  = useState(false)
  const [sendError,    setSendError]    = useState('')

  const [cannedOpen, setCannedOpen] = useState(false)

  type PendingMsg = { _tempId: string; text: string; isInternal: boolean; status: 'sending' | 'error'; createdAt: string }
  const [pendingMsgs, setPendingMsgs] = useState<PendingMsg[]>([])

  const [assigning,    setAssigning]    = useState(false)
  const [changingPri,  setChangingPri]  = useState(false)
  const [changingSt,   setChangingSt]   = useState(false)
  const [actionError,  setActionError]  = useState('')

  const isClosed = ticket.status === 'CLOSED'
  const st       = STATUS_LABELS[ticket.status] ?? STATUS_LABELS['AWAITING_SUPPORT']
  const priColor = PRIORITY_COLOR[ticket.priority] ?? '#B9B9C2'

  async function handleSend(retryTempId?: string) {
    if (!replyText.trim()) return
    const text      = replyText.trim()
    const internal  = isInternal
    const tempId    = retryTempId ?? `tmp-${Date.now()}`
    const createdAt = new Date().toISOString()

    if (!retryTempId) {
      setPendingMsgs(prev => [...prev, { _tempId: tempId, text, isInternal: internal, status: 'sending', createdAt }])
      setReplyText('')
    } else {
      setPendingMsgs(prev => prev.map(m => m._tempId === tempId ? { ...m, status: 'sending' } : m))
    }
    setSendLoading(true); setSendError('')

    try {
      const res = await fetch(`/api/support/${ticket.id}/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, isInternal: internal }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPendingMsgs(prev => prev.map(m => m._tempId === tempId ? { ...m, status: 'error' } : m))
        setSendError(data.error ?? 'Ошибка')
        return
      }
      setPendingMsgs(prev => prev.filter(m => m._tempId !== tempId))
      setMessages(prev => [...prev, data])
      setIsInternal(false)
    } catch {
      setPendingMsgs(prev => prev.map(m => m._tempId === tempId ? { ...m, status: 'error' } : m))
      setSendError('Ошибка сети')
    } finally {
      setSendLoading(false)
    }
  }

  async function handleAssign() {
    setAssigning(true); setActionError('')
    try {
      const res = await fetch(`/api/support/${ticket.id}/assign`, { method: 'POST' })
      if (res.ok) {
        setTicket(t => ({ ...t, assignedTo: agentId }))
        setAgent({ id: agentId, name: 'Вы' })
      } else {
        const d = await res.json()
        setActionError(d.error ?? 'Ошибка')
      }
    } finally {
      setAssigning(false)
    }
  }

  async function handlePriority(priority: string) {
    setChangingPri(true); setActionError('')
    try {
      const res = await fetch(`/api/support/${ticket.id}/priority`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priority }),
      })
      if (res.ok) setTicket(t => ({ ...t, priority }))
      else {
        const d = await res.json()
        setActionError(d.error ?? 'Ошибка')
      }
    } finally {
      setChangingPri(false)
    }
  }

  async function handleStatus(status: string) {
    setChangingSt(true); setActionError('')
    try {
      const res = await fetch(`/api/support/${ticket.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      if (res.ok) setTicket(t => ({ ...t, status }))
      else {
        const d = await res.json()
        setActionError(d.error ?? 'Ошибка')
      }
    } finally {
      setChangingSt(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>

      {/* ── Left column: messages + composer ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--admin-border)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg2)' }}>
          <Link href="/admin/support" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--admin-muted)', textDecoration: 'none', marginBottom: '12px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '14px' }} /> Обращения
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif' }}>
                {ticket.subject}
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                #{ticket.number} · {getCategoryLabel(ticket.category)}
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', color: st.color, background: st.bg, flexShrink: 0 }}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Messages thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--admin-bg-page, var(--admin-bg2))' }}>
          {messages.map(msg => {
            const isUser = !msg.isStaff
            if (msg.isInternal) {
              return (
                <div key={msg.id} style={{ padding: '10px 14px', borderRadius: '10px', background: '#FFF8EC', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', gap: '8px' }}>
                  <i className="ti ti-lock" style={{ fontSize: '14px', color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, marginBottom: '4px' }}>Внутренняя заметка · не видна клиенту</div>
                    <div style={{ fontSize: '13px', color: '#6B5B00', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
                    <div style={{ fontSize: '11px', color: '#A08C3A', marginTop: '6px' }}>{new Date(msg.createdAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px',
                  borderRadius: isUser ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  background: isUser ? 'var(--admin-bg)' : 'rgba(72,128,255,0.1)',
                  border: `1px solid ${isUser ? 'var(--admin-border)' : 'rgba(72,128,255,0.2)'}`,
                  fontSize: '13px', lineHeight: 1.5, color: 'var(--admin-text)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '4px', padding: '0 2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {msg.isStaff ? 'Вы' : (owner?.name ?? 'Клиент')} · {new Date(msg.createdAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {msg.isStaff && (() => {
                    const isRead = ticket.userReadAt && new Date(ticket.userReadAt) >= new Date(msg.createdAt)
                    return isRead
                      ? <i className="ti ti-checks" style={{ fontSize: '13px', color: 'var(--admin-accent)' }} />
                      : <i className="ti ti-check"  style={{ fontSize: '13px', color: 'var(--admin-muted)' }} />
                  })()}
                </div>
              </div>
            )
          })}

          {/* Optimistic messages */}
          {pendingMsgs.map(pm => (
            <div key={pm._tempId} style={{ display: 'flex', flexDirection: 'column', alignItems: pm.isInternal ? 'stretch' : 'flex-end' }}>
              {pm.isInternal ? (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FFF8EC', border: '1px solid rgba(245,158,11,0.25)', opacity: 0.7, display: 'flex', gap: '8px' }}>
                  <i className="ti ti-lock" style={{ fontSize: '14px', color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, marginBottom: '4px' }}>Внутренняя заметка</div>
                    <div style={{ fontSize: '13px', color: '#6B5B00', whiteSpace: 'pre-wrap' }}>{pm.text}</div>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 4px 12px 12px', background: 'rgba(72,128,255,0.1)', border: '1px solid rgba(72,128,255,0.2)', fontSize: '13px', lineHeight: 1.5, color: 'var(--admin-text)', whiteSpace: 'pre-wrap', opacity: pm.status === 'sending' ? 0.7 : 1 }}>
                  {pm.text}
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Вы · только что
                {pm.status === 'sending' && <i className="ti ti-clock"        style={{ fontSize: '13px', color: 'var(--admin-muted)' }} />}
                {pm.status === 'error'   && <i className="ti ti-alert-circle" style={{ fontSize: '13px', color: 'var(--admin-danger)' }} />}
              </div>
              {pm.status === 'error' && (
                <div style={{ fontSize: '11px', color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  Не отправлено ·
                  <button onClick={() => { setReplyText(pm.text); setIsInternal(pm.isInternal); setPendingMsgs(p => p.filter(m => m._tempId !== pm._tempId)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-danger)', fontSize: '11px', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>
                    <i className="ti ti-refresh" /> Отправить снова
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Composer */}
        {!isClosed ? (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                  e.preventDefault()
                  if (replyText.trim() && !sendLoading) handleSend()
                }
              }}
              placeholder={isInternal ? 'Внутренняя заметка... (Enter — отправить, Shift+Enter — новая строка)' : 'Ответ клиенту... (Enter — отправить, Shift+Enter — новая строка)'}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: isInternal ? '#FFFDF0' : 'var(--admin-bg2)',
                border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'var(--admin-border)'}`,
                borderRadius: '8px', padding: '10px 12px',
                color: 'var(--admin-text)', fontSize: '13px',
                outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            {sendError && <p style={{ fontSize: '12px', color: 'var(--admin-danger)', margin: 0 }}>{sendError}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Toggle internal */}
              <button
                onClick={() => setIsInternal(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: `1px solid ${isInternal ? 'rgba(245,158,11,0.4)' : 'var(--admin-border)'}`, background: isInternal ? 'rgba(245,158,11,0.08)' : 'transparent', color: isInternal ? '#F59E0B' : 'var(--admin-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <i className={`ti ${isInternal ? 'ti-square-check' : 'ti-square'}`} style={{ fontSize: '14px' }} />
                Внутренняя заметка
              </button>

              {/* Canned responses */}
              {cannedResponses.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setCannedOpen(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <i className="ti ti-template" style={{ fontSize: '14px' }} />
                    Шаблоны
                    <i className="ti ti-chevron-down" style={{ fontSize: '12px' }} />
                  </button>
                  {cannedOpen && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: '260px', zIndex: 10, overflow: 'hidden' }}>
                      {cannedResponses.map(cr => (
                        <button
                          key={cr.id}
                          onClick={() => { setReplyText(cr.text); setCannedOpen(false) }}
                          style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--admin-border)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                          className="canned-item"
                        >
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', marginBottom: '2px' }}>{cr.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cr.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Send button — right-aligned */}
              <button
                onClick={() => handleSend()}
                disabled={sendLoading || !replyText.trim()}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: sendLoading || !replyText.trim() ? 'not-allowed' : 'pointer', opacity: sendLoading || !replyText.trim() ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                <i className="ti ti-send" style={{ fontSize: '14px' }} />
                {sendLoading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg2)', textAlign: 'center', fontSize: '13px', color: 'var(--admin-muted)' }}>
            Тикет закрыт
          </div>
        )}
      </div>

      {/* ── Right panel: sidebar ── */}
      <div style={{ width: '280px', flexShrink: 0, padding: '24px 20px', background: 'var(--admin-bg)', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

        {/* Client */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Клиент</div>
          {owner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text)' }}>{owner.name ?? 'Без имени'}</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{owner.email ?? '—'}</div>
              <Link href={`/admin/users/${owner.id}`} style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Профиль <i className="ti ti-arrow-right" style={{ fontSize: '11px' }} />
              </Link>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>—</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--admin-border)' }} />

        {/* Assignment */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Назначен</div>
          {ticket.assignedTo ? (
            <div style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
              {ticket.assignedTo === agentId ? 'Вы' : (agent?.name ?? 'Другой агент')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>Не назначен</div>
              <button
                onClick={handleAssign}
                disabled={assigning}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--admin-accent)', background: 'rgba(72,128,255,0.08)', color: 'var(--admin-accent)', fontSize: '12px', fontWeight: 600, cursor: assigning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: assigning ? 0.7 : 1 }}
              >
                <i className="ti ti-user-check" style={{ fontSize: '14px' }} />
                {assigning ? 'Назначение...' : 'Взять в работу'}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--admin-border)' }} />

        {/* Priority */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Приоритет</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: `${priColor}18`, color: priColor, border: `1px solid ${priColor}40` }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priColor }} />
              {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
              <button
                key={p}
                onClick={() => handlePriority(p)}
                disabled={changingPri || ticket.priority === p}
                style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${ticket.priority === p ? PRIORITY_COLOR[p] : 'var(--admin-border)'}`, background: ticket.priority === p ? `${PRIORITY_COLOR[p]}14` : 'transparent', color: ticket.priority === p ? PRIORITY_COLOR[p] : 'var(--admin-muted)', fontSize: '11px', fontWeight: ticket.priority === p ? 700 : 400, cursor: ticket.priority === p ? 'default' : 'pointer', fontFamily: 'inherit', opacity: changingPri ? 0.7 : 1 }}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--admin-border)' }} />

        {/* Status */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Статус</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(['AWAITING_SUPPORT', 'AWAITING_USER', 'CLOSED'] as const).map(s => {
              const stInfo = STATUS_LABELS[s]
              const isActive = ticket.status === s
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={changingSt || isActive}
                  style={{ padding: '7px 10px', borderRadius: '7px', border: `1px solid ${isActive ? stInfo.color : 'var(--admin-border)'}`, background: isActive ? stInfo.bg : 'transparent', color: isActive ? stInfo.color : 'var(--admin-muted)', fontSize: '12px', fontWeight: isActive ? 700 : 400, cursor: isActive ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', opacity: changingSt ? 0.7 : 1 }}
                >
                  {stInfo.label}
                </button>
              )
            })}
          </div>
        </div>

        {actionError && (
          <div style={{ fontSize: '12px', color: 'var(--admin-danger)', padding: '8px 10px', borderRadius: '6px', background: 'rgba(239,56,38,0.06)', border: '1px solid rgba(239,56,38,0.2)' }}>
            {actionError}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--admin-border)' }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {!isClosed && (
            <>
              <button
                onClick={() => handlePriority('URGENT')}
                disabled={ticket.priority === 'URGENT' || changingPri}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(239,56,38,0.3)', background: 'rgba(239,56,38,0.06)', color: 'var(--admin-danger)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: ticket.priority === 'URGENT' ? 0.4 : 1 }}
              >
                <i className="ti ti-arrow-up" style={{ fontSize: '15px' }} />
                Эскалировать
              </button>
              <button
                onClick={() => handleStatus('CLOSED')}
                disabled={changingSt}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <i className="ti ti-lock" style={{ fontSize: '15px' }} />
                Закрыть тикет
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .canned-item:hover { background: var(--admin-bg2) !important; }
        .canned-item:last-child { border-bottom: none !important; }
      `}</style>
    </div>
  )
}
