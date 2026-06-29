'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'
const avatarSrc   = (img: string) => img.startsWith('http') ? img : `${S3_ENDPOINT}/${S3_BUCKET}/${img}`

type LogEntry = {
  id: string
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown> | null
  createdAt: string
  adminName: string
  adminEmail: string
  adminImage: string | null
}

type AdminOption = { id: string; name: string }

type SystemLogEntry = {
  id: string
  level: string
  event: string
  message: string
  details: Record<string, unknown> | null
  createdAt: string
}

type Props = {
  tab: 'admin' | 'system'
  logs: LogEntry[]
  admins: AdminOption[]
  total: number
  currentPage: number
  perPage: number
  currentAction: string
  currentAdminId: string
  systemLogs: SystemLogEntry[]
  systemTotal: number
  systemPage: number
}

// Человекочитаемые названия действий + иконки + цвета
const ACTION_INFO: Record<string, { label: string; icon: string; color: string }> = {
  // Пользователи
  'user.role_change':                 { label: 'Смена роли',                    icon: 'ti-user-cog',        color: '#4880FF' },
  'user.ban':                         { label: 'Блокировка пользователя',        icon: 'ti-lock',            color: '#EF3826' },
  'user.unban':                       { label: 'Разблокировка пользователя',     icon: 'ti-lock-open',       color: '#00B69B' },
  // Верификация
  'verification.approve':             { label: 'Верификация подтверждена',       icon: 'ti-shield-check',    color: '#00B69B' },
  'verification.reject':              { label: 'Верификация отклонена',          icon: 'ti-shield-x',        color: '#EF3826' },
  'verification.toggle_auto_publish': { label: 'Авто-публикация изменена',      icon: 'ti-toggle-left',     color: '#4880FF' },
  // Заказы
  'order.status_change':              { label: 'Статус заказа изменён',          icon: 'ti-receipt',         color: '#FFA756' },
  // Семейства
  'product.update':                   { label: 'Семейство изменено',             icon: 'ti-edit',            color: '#4880FF' },
  'product.publish':                  { label: 'Семейство опубликовано',         icon: 'ti-eye',             color: '#00B69B' },
  'product.unpublish':                { label: 'Семейство снято с публикации',   icon: 'ti-eye-off',         color: '#FFA756' },
  'product.approve_pending_bundle':   { label: 'Семейство одобрено (сборка)',    icon: 'ti-package-check',   color: '#00B69B' },
  // Паки
  'pack.approve':                     { label: 'Пак одобрен',                    icon: 'ti-stack-2',         color: '#00B69B' },
  'pack.reject':                      { label: 'Пак отклонён',                   icon: 'ti-stack-2',         color: '#EF3826' },
  'pack.retry_bundle':                { label: 'Пересборка архива пака',         icon: 'ti-refresh',         color: '#4880FF' },
  // Отзывы паков
  'pack_review.approve':              { label: 'Отзыв пака одобрен',            icon: 'ti-message-check',   color: '#00B69B' },
  'pack_review.reject':               { label: 'Отзыв пака отклонён',           icon: 'ti-message-x',       color: '#EF3826' },
  // Категории
  'category.create':                  { label: 'Категория создана',              icon: 'ti-plus',            color: '#00B69B' },
  'category.delete':                  { label: 'Категория удалена',              icon: 'ti-trash',           color: '#EF3826' },
  // Настройки
  'settings.update':                  { label: 'Настройки изменены',             icon: 'ti-settings',        color: '#4880FF' },
}

const ACTIONS_FILTER = [
  { value: 'all', label: 'Все действия' },
  ...Object.entries(ACTION_INFO).map(([value, info]) => ({ value, label: info.label })),
]

// Ссылка на сущность, если есть куда вести
function targetLink(targetType: string, targetId: string | null): string | null {
  if (!targetId) return null
  switch (targetType) {
    case 'User':    return `/admin/users/${targetId}`
    case 'Product': return `/admin/families/${targetId}`
    case 'Order':   return `/admin/orders/${targetId}`
    default:        return null
  }
}

// Краткое описание details для отображения в таблице
function formatDetails(action: string, details: Record<string, unknown> | null): string | null {
  if (!details) return null

  if (action === 'user.role_change' && details.from && details.to) {
    return `${details.from} → ${details.to}`
  }
  if (action === 'order.status_change' && details.from && details.to) {
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'Ожидание', PAID: 'Оплачено', CANCELLED: 'Отменено', REFUNDED: 'Возврат',
    }
    const from = STATUS_LABELS[details.from as string] ?? details.from
    const to   = STATUS_LABELS[details.to as string]   ?? details.to
    return `${from} → ${to}`
  }
  if (action === 'verification.toggle_auto_publish') {
    return details.autoPublish ? 'включена' : 'выключена'
  }
  if ((action === 'category.create' || action === 'category.delete') && details.name) {
    return String(details.name)
  }
  if ((action === 'product.publish' || action === 'product.unpublish' || action === 'product.update') && details.productName) {
    return String(details.productName)
  }
  if (action === 'settings.update') {
    const keys = Object.keys(details)
    return `${keys.length} ${keys.length === 1 ? 'параметр' : 'параметров'}`
  }
  return null
}

const LEVEL_INFO: Record<string, { label: string; color: string; icon: string }> = {
  info:  { label: 'INFO',  color: '#4880FF', icon: 'ti-info-circle' },
  warn:  { label: 'WARN',  color: '#FFA756', icon: 'ti-alert-triangle' },
  error: { label: 'ERROR', color: '#EF3826', icon: 'ti-circle-x' },
  fatal: { label: 'FATAL', color: '#EF3826', icon: 'ti-skull' },
}

const EVENT_LABELS: Record<string, string> = {
  startup:              'Запуск сервера',
  shutdown:             'Остановка сервера',
  memory_warning:       'Предупреждение памяти',
  uncaught_exception:   'Непойманное исключение',
  unhandled_rejection:  'Необработанный rejection',
  worker_error:         'Ошибка воркера',
}

export default function AdminLogsClient({
  tab, logs, admins, total, currentPage, perPage, currentAction, currentAdminId,
  systemLogs, systemTotal, systemPage,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / perPage)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { action: currentAction, adminId: currentAdminId, page: '1', ...updates }
    if (merged.action  && merged.action  !== 'all') params.set('action', merged.action)
    if (merged.adminId && merged.adminId !== 'all') params.set('adminId', merged.adminId)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    startTransition(() => router.push(params.toString() ? `${pathname}?${params}` : pathname))
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .log-row:hover { background: rgba(72,128,255,0.04) !important; }
        .log-row { transition: background 0.15s; }
        .role-tab { transition: all 0.15s; cursor: pointer; border: none; }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Журнал</h1>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: '1px solid var(--admin-border)' }}>
        {[
          { value: 'admin',  label: 'Действия администраторов', icon: 'ti-user-shield' },
          { value: 'system', label: 'Системные события',         icon: 'ti-server' },
        ].map(t => (
          <button key={t.value}
            onClick={() => startTransition(() => router.push(t.value === 'system' ? `${pathname}?tab=system` : pathname))}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer',
              fontWeight: tab === t.value ? 600 : 400,
              background: tab === t.value ? 'var(--admin-bg)' : 'transparent',
              color: tab === t.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
              boxShadow: tab === t.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: '14px' }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== SYSTEM LOGS TAB ===== */}
      {tab === 'system' && (
        <div style={{
          background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
          borderRadius: '14px', overflow: 'hidden',
          opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 180px 1fr 160px',
            padding: '12px 20px', borderBottom: '1px solid var(--admin-border)',
            background: 'var(--admin-bg2)',
          }}>
            {['Уровень', 'Событие', 'Сообщение', 'Дата'].map(h => (
              <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </span>
            ))}
          </div>

          {systemLogs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
              Системных событий не найдено
            </div>
          ) : systemLogs.map(log => {
            const lvl = LEVEL_INFO[log.level] ?? LEVEL_INFO.info
            const isExpanded = expandedId === log.id
            return (
              <div key={log.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div
                  className="log-row"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '80px 180px 1fr 160px',
                    padding: '12px 20px', alignItems: 'center', cursor: 'pointer',
                  }}>
                  {/* Level */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                      background: `${lvl.color}1A`, color: lvl.color,
                    }}>
                      <i className={`ti ${lvl.icon}`} style={{ fontSize: '11px' }} />
                      {lvl.label}
                    </span>
                  </div>
                  {/* Event */}
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                    {EVENT_LABELS[log.event] ?? log.event}
                  </div>
                  {/* Message */}
                  <div style={{ fontSize: '13px', color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '16px' }}>
                    {log.message}
                  </div>
                  {/* Date */}
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                    {new Date(log.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && log.details && (
                  <div style={{ padding: '0 20px 14px', marginTop: '-4px' }}>
                    <pre style={{
                      margin: 0, padding: '12px 14px', borderRadius: '8px',
                      background: 'var(--admin-bg2)', border: '1px solid var(--admin-border)',
                      fontSize: '12px', color: 'var(--admin-muted)',
                      overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      maxHeight: '300px', overflowY: 'auto',
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination for system logs */}
          {Math.ceil(systemTotal / 30) > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
                {(systemPage - 1) * 30 + 1}–{Math.min(systemPage * 30, systemTotal)} из {systemTotal}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {systemPage > 1 && (
                  <button onClick={() => startTransition(() => router.push(`${pathname}?tab=system&page=${systemPage - 1}`))}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                    <i className="ti ti-chevron-left" />
                  </button>
                )}
                {Array.from({ length: Math.min(Math.ceil(systemTotal / 30), 5) }, (_, i) => i + 1).map(pg => (
                  <button key={pg} onClick={() => startTransition(() => router.push(`${pathname}?tab=system&page=${pg}`))}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                      border: `1px solid ${pg === systemPage ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                      background: pg === systemPage ? 'var(--admin-accent)' : 'var(--admin-bg)',
                      color: pg === systemPage ? '#fff' : 'var(--admin-text)',
                    }}>
                    {pg}
                  </button>
                ))}
                {systemPage < Math.ceil(systemTotal / 30) && (
                  <button onClick={() => startTransition(() => router.push(`${pathname}?tab=system&page=${systemPage + 1}`))}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                    <i className="ti ti-chevron-right" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADMIN LOGS TAB ===== */}
      {tab === 'admin' && <>
      {/* Filters */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <select
          value={currentAction}
          onChange={e => updateParams({ action: e.target.value })}
          style={{
            padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
            border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
            color: 'var(--admin-text)', outline: 'none', cursor: 'pointer',
            maxWidth: '240px',
          }}>
          {ACTIONS_FILTER.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {admins.length > 1 && (
          <select
            value={currentAdminId}
            onChange={e => updateParams({ adminId: e.target.value })}
            style={{
              padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
              border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
              color: 'var(--admin-text)', outline: 'none', cursor: 'pointer',
              maxWidth: '200px',
            }}>
            <option value="all">Все администраторы</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
        borderRadius: '14px', overflow: 'hidden',
        opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1.5fr 1fr',
          padding: '12px 20px', borderBottom: '1px solid var(--admin-border)',
          background: 'var(--admin-bg2)',
        }}>
          {['Действие', 'Детали', 'Администратор', 'Цель', 'Дата'].map(h => (
            <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
            Записей не найдено
          </div>
        ) : logs.map(log => {
          const info = ACTION_INFO[log.action] ?? { label: log.action, icon: 'ti-activity', color: '#848484' }
          const detailsText = formatDetails(log.action, log.details)
          const link = targetLink(log.targetType, log.targetId)

          const row = (
            <div className="log-row" style={{
              display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1.5fr 1fr',
              padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', alignItems: 'center',
            }}>
              {/* Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: `${info.color}1A`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={`ti ${info.icon}`} style={{ fontSize: '15px', color: info.color }} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{info.label}</span>
              </div>

              {/* Details */}
              <div style={{ fontSize: '13px', color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {detailsText ?? '—'}
              </div>

              {/* Admin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {log.adminImage ? (
                  <img src={avatarSrc(log.adminImage)} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(72,128,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                      {log.adminName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span style={{ fontSize: '13px', color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.adminName}
                </span>
              </div>

              {/* Target */}
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                {link ? (
                  <Link href={link} style={{ color: 'var(--admin-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {log.targetType} <i className="ti ti-arrow-right" style={{ fontSize: '13px' }} />
                  </Link>
                ) : (
                  log.targetType
                )}
              </div>

              {/* Date */}
              <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                {formatDate(log.createdAt)}
              </div>
            </div>
          )

          return <div key={log.id}>{row}</div>
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>
              {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, total)} из {total}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {currentPage > 1 && (
                <button onClick={() => updateParams({ page: String(currentPage - 1) })}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                  <i className="ti ti-chevron-left" />
                </button>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pg => (
                <button key={pg} onClick={() => updateParams({ page: String(pg) })}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                    border: `1px solid ${pg === currentPage ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                    background: pg === currentPage ? 'var(--admin-accent)' : 'var(--admin-bg)',
                    color: pg === currentPage ? '#fff' : 'var(--admin-text)',
                    fontWeight: pg === currentPage ? 600 : 400,
                  }}>
                  {pg}
                </button>
              ))}
              {currentPage < totalPages && (
                <button onClick={() => updateParams({ page: String(currentPage + 1) })}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: '13px' }}>
                  <i className="ti ti-chevron-right" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </>}

    </div>
  )
}
