'use client'

// src/app/(public)/faq/FaqClient.tsx
import { useState } from 'react'
import Link from 'next/link'
import { TICKET_CATEGORIES } from '@/lib/ticket-categories'

type FaqArticle = {
  id:         string
  question:   string
  answer:     string
  category:   string | null
  helpfulYes: number
  helpfulNo:  number
}

type Props = {
  articles:    FaqArticle[]
  isLoggedIn:  boolean
}

const CAT_ICONS: Record<string, string> = {
  PAYMENT:    'ti-credit-card',
  DOWNLOAD:   'ti-download',
  MODERATION: 'ti-shield-check',
  ACCOUNT:    'ti-user',
  OTHER:      'ti-bulb',
}

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Общее'
  return (TICKET_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat
}

function FaqAccordionItem({ article }: { article: FaqArticle }) {
  const [open, setOpen]           = useState(false)
  const [voted, setVoted]         = useState<'yes' | 'no' | null>(null)
  const [helpfulYes, setYes]      = useState(article.helpfulYes)
  const [helpfulNo, setNo]        = useState(article.helpfulNo)
  const [voteLoading, setLoading] = useState(false)

  async function vote(v: 'yes' | 'no') {
    if (voted || voteLoading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/faq/${article.id}/helpful`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ vote: v }),
      })
      if (res.ok) {
        const data = await res.json()
        setYes(data.helpfulYes)
        setNo(data.helpfulNo)
        setVoted(v)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '14px 16px', background: open ? 'var(--bg)' : 'var(--bg2)',
          border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
          {article.question}
        </span>
        <i
          className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`}
          style={{ fontSize: '16px', color: 'var(--muted)', flexShrink: 0 }}
        />
      </button>

      {open && (
        <div style={{ padding: '12px 16px 16px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
            {article.answer}
          </p>

          {/* Helpful voting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Это помогло?</span>
            <button
              onClick={() => vote('yes')}
              disabled={!!voted || voteLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)',
                background: voted === 'yes' ? 'rgba(29,158,117,0.1)' : 'var(--bg2)',
                color: voted === 'yes' ? '#1D9E75' : 'var(--muted)',
                fontSize: '12px', cursor: voted ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: voted && voted !== 'yes' ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <i className="ti ti-thumb-up" style={{ fontSize: '13px' }} />
              Да {helpfulYes > 0 && <span>({helpfulYes})</span>}
            </button>
            <button
              onClick={() => vote('no')}
              disabled={!!voted || voteLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)',
                background: voted === 'no' ? 'rgba(226,75,74,0.1)' : 'var(--bg2)',
                color: voted === 'no' ? '#E24B4A' : 'var(--muted)',
                fontSize: '12px', cursor: voted ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: voted && voted !== 'no' ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <i className="ti ti-thumb-down" style={{ fontSize: '13px' }} />
              Нет {helpfulNo > 0 && <span>({helpfulNo})</span>}
            </button>
            {voted && (
              <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '4px' }}>
                {voted === 'yes' ? 'Спасибо!' : 'Понятно, попробуем улучшить'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FaqClient({ articles, isLoggedIn }: Props) {
  const [search,        setSearch]     = useState('')
  const [activeTab,     setActiveTab]  = useState<string>('ALL')
  const [showContact,   setShowContact] = useState(false)
  const [cName,         setCName]       = useState('')
  const [cEmail,        setCEmail]      = useState('')
  const [cCategory,     setCCategory]   = useState('')
  const [cMessage,      setCMessage]    = useState('')
  const [cLoading,      setCLoading]    = useState(false)
  const [cSent,         setCSent]       = useState(false)
  const [cTicketNum,    setCTicketNum]  = useState<number | null>(null)
  const [cError,        setCError]      = useState('')

  const CONTACT_CATS = [
    { key: 'PAYMENT',    label: 'Оплата',          icon: 'ti-credit-card'  },
    { key: 'DOWNLOAD',   label: 'Скачивание',       icon: 'ti-download'     },
    { key: 'ACCOUNT',    label: 'Аккаунт',          icon: 'ti-user'         },
    { key: 'MODERATION', label: 'Модерация',        icon: 'ti-shield-check' },
    { key: 'OTHER',      label: 'Другое',           icon: 'ti-help-circle'  },
  ]

  async function handleContact(e: React.FormEvent) {
    e.preventDefault()
    if (!cCategory) { setCError('Выберите категорию'); return }
    setCLoading(true); setCError('')
    const catLabel = CONTACT_CATS.find(c => c.key === cCategory)?.label ?? cCategory
    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:    cName,
          email:   cEmail,
          subject: `[${catLabel}] ${cMessage.slice(0, 60)}`,
          message: cMessage,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCError(data.error ?? 'Ошибка'); return }
      setCSent(true)
      if (data.number) setCTicketNum(data.number)
    } catch {
      setCError('Ошибка сети')
    } finally {
      setCLoading(false)
    }
  }

  // Derive unique categories from articles
  const categories = Array.from(
    new Set(articles.map(a => a.category).filter(Boolean))
  ) as string[]

  // Filter articles
  const filtered = articles.filter(a => {
    const matchesTab = activeTab === 'ALL' || a.category === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !q || a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const tabs: { key: string; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Все', icon: 'ti-layout-grid' },
    ...categories.map(cat => ({
      key:   cat,
      label: getCategoryLabel(cat),
      icon:  CAT_ICONS[cat] ?? 'ti-help-circle',
    })),
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>
          Частые <span>вопросы</span>
        </h1>
        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)', marginBottom: '32px' }}>
          Не нашли ответ? <Link href="/account?tab=support" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Напишите нам</Link>
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Поиск по вопросам..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px 14px 12px 42px',
              color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', lineHeight: 1 }}
            >
              <i className="ti ti-x" style={{ fontSize: '15px' }} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '20px',
                  border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                  background: activeTab === tab.key ? 'rgba(72,128,255,0.1)' : 'var(--bg2)',
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: '14px' }} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Articles */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            <i className="ti ti-search" style={{ fontSize: '32px', opacity: 0.3, display: 'block', marginBottom: '12px' }} />
            <p style={{ fontSize: '14px' }}>Ничего не найдено. Попробуйте другой запрос или обратитесь в поддержку.</p>
          </div>
        ) : (
          <div>
            {filtered.map(article => (
              <FaqAccordionItem key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Contact block */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginTop: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '6px', fontSize: '16px' }}>Остались вопросы?</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Ответим в течение рабочего дня
            </p>
          </div>

          {isLoggedIn ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Link href="/account?tab=support" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-headset" style={{ fontSize: '15px' }} />
                Написать в поддержку
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '16px' }}>
                <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Войдите</Link> чтобы создать обращение, или напишите нам напрямую:
              </p>

              {cSent ? (
                <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.25)', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-check" />
                  {cTicketNum
                    ? `Обращение #${cTicketNum} создано — ответ придёт на ${cEmail}`
                    : `Обращение создано — ответ придёт на ${cEmail}`
                  }
                </div>
              ) : showContact ? (
                <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Category chips */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Тема обращения *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {CONTACT_CATS.map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setCCategory(cat.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                            border: `1px solid ${cCategory === cat.key ? 'var(--accent)' : 'var(--border)'}`,
                            background: cCategory === cat.key ? 'rgba(72,128,255,0.1)' : 'var(--bg)',
                            color: cCategory === cat.key ? 'var(--accent)' : 'var(--muted)',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          }}
                        >
                          <i className={`ti ${cat.icon}`} style={{ fontSize: '13px' }} />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      placeholder="Ваше имя"
                      value={cName} onChange={e => setCName(e.target.value)} required maxLength={100}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <input
                      type="email" placeholder="Email для ответа"
                      value={cEmail} onChange={e => setCEmail(e.target.value)} required maxLength={200}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                  <textarea
                    placeholder="Опишите вашу проблему подробнее"
                    value={cMessage} onChange={e => setCMessage(e.target.value)} required minLength={10} maxLength={5000} rows={4}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  {cError && <p style={{ fontSize: '12px', color: 'var(--danger)', margin: 0 }}>{cError}</p>}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowContact(false)} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Отмена</button>
                    <button type="submit" disabled={cLoading} className="btn-primary" style={{ padding: '8px 20px', fontSize: '13px', opacity: cLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {cLoading ? <i className="ti ti-loader-2" /> : <i className="ti ti-send" />}
                      {cLoading ? 'Отправка...' : 'Отправить'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setShowContact(true)} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <i className="ti ti-mail" style={{ fontSize: '15px' }} />
                    Написать
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
