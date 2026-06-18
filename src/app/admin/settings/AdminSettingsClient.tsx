'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Settings = {
  platformName: string
  platformDescription: string
  commission: string
  minPayout: string
  autoPublish: string
  maintenanceMode: string
  emailNewOrder: string
  emailNewAuthor: string
}

type Category = { id: string; name: string; emoji: string; order: number }

type Props = { settings: Settings; categories: Category[] }

const SECTION_KEYS = ['platform', 'finance', 'content', 'notifications', 'categories', 'technical'] as const
type SectionKey = typeof SECTION_KEYS[number]

function CollapsibleSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px', background: 'var(--admin-bg2)',
          borderBottom: open ? '1px solid var(--admin-border)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>{title}</h3>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`}
          style={{ fontSize: '16px', color: 'var(--admin-muted)' }} />
      </div>
      {open && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'start', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>{label}</div>
        {hint && <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: '10px', fontSize: '13px',
  border: '1px solid var(--admin-border)', background: 'var(--admin-bg2)',
  color: 'var(--admin-text)', outline: 'none', width: '100%', maxWidth: '400px',
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
      background: checked ? 'var(--admin-accent)' : 'var(--admin-border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function AdminSettingsClient({ settings: initial, categories: initialCategories }: Props) {
  const router = useRouter()
  const [settings, setSettings] = useState(initial)
  const [categories, setCategories] = useState(initialCategories)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', emoji: '📦' })
  const [addingCat, setAddingCat] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Состояние открытости секций — все открыты по умолчанию
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    platform:      true,
    finance:       true,
    content:       true,
    notifications: true,
    categories:    true,
    technical:     true,
  })

  const allOpen   = SECTION_KEYS.every(k => openSections[k])
  const allClosed = SECTION_KEYS.every(k => !openSections[k])

  function toggleSection(key: SectionKey) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleAll() {
    const next = !allOpen
    const updated = Object.fromEntries(SECTION_KEYS.map(k => [k, next])) as Record<SectionKey, boolean>
    setOpenSections(updated)
  }

  function set(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function saveSettings() {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_name:        settings.platformName,
        platform_description: settings.platformDescription,
        commission:           settings.commission,
        min_payout:           settings.minPayout,
        auto_publish:         settings.autoPublish,
        maintenance_mode:     settings.maintenanceMode,
        email_new_order:      settings.emailNewOrder,
        email_new_author:     settings.emailNewAuthor,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addCategory() {
    if (!newCat.name.trim()) return
    setAddingCat(true)
    setCategoryError('')

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      })

      const data = await res.json()

      if (!res.ok) {
        setCategoryError(data.error ?? 'Не удалось создать категорию')
        setAddingCat(false)
        return
      }

      setCategories(prev => [...prev, data])
      setNewCat({ name: '', emoji: '📦' })
      setAddingCat(false)
      router.refresh()
    } catch {
      setCategoryError('Ошибка соединения с сервером')
      setAddingCat(false)
    }
  }

  async function deleteCategory(id: string) {
    setDeletingId(id)
    setCategoryError('')

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setCategoryError(data.error ?? 'Не удалось удалить категорию')
        setDeletingId(null)
        return
      }

      setCategories(prev => prev.filter(c => c.id !== id))
      setDeletingId(null)
      router.refresh()
    } catch {
      setCategoryError('Ошибка соединения с сервером')
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ti-loader-2 { display: inline-block; animation: spin 0.8s linear infinite; }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Настройки</h1>
          <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px', marginBottom: 0 }}>Управление платформой</p>
        </div>
        <button
          onClick={toggleAll}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px',
            border: '1px solid var(--admin-border)',
            background: 'var(--admin-bg)',
            fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <i className={`ti ${allOpen ? 'ti-fold' : 'ti-fold-up'}`} style={{ fontSize: '14px' }} />
          {allOpen ? 'Свернуть все' : 'Развернуть все'}
        </button>
      </div>

      {/* Платформа */}
      <CollapsibleSection title="Платформа" open={openSections.platform} onToggle={() => toggleSection('platform')}>
        <Field label="Название" hint="Отображается в заголовке">
          <input style={inputStyle} value={settings.platformName} onChange={e => set('platformName', e.target.value)} />
        </Field>
        <Field label="Описание">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
            value={settings.platformDescription} onChange={e => set('platformDescription', e.target.value)} />
        </Field>
      </CollapsibleSection>

      {/* Финансы */}
      <CollapsibleSection title="Финансы" open={openSections.finance} onToggle={() => toggleSection('finance')}>
        <Field label="Комиссия платформы" hint="Процент с каждой продажи">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input style={{ ...inputStyle, maxWidth: '120px' }} type="number" min="0" max="100"
              value={settings.commission} onChange={e => set('commission', e.target.value)} />
            <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>%</span>
          </div>
        </Field>
        <Field label="Мин. сумма выплаты" hint="Минимум для вывода средств автором">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input style={{ ...inputStyle, maxWidth: '120px' }} type="number" min="0"
              value={settings.minPayout} onChange={e => set('minPayout', e.target.value)} />
            <span style={{ fontSize: '13px', color: 'var(--admin-muted)' }}>₽</span>
          </div>
        </Field>
      </CollapsibleSection>

      {/* Контент */}
      <CollapsibleSection title="Контент" open={openSections.content} onToggle={() => toggleSection('content')}>
        <Field label="Авто-публикация" hint="Публиковать семейства без модерации">
          <Toggle checked={settings.autoPublish === 'true'} onChange={v => set('autoPublish', String(v))} />
        </Field>
      </CollapsibleSection>

      {/* Уведомления */}
      <CollapsibleSection title="Email уведомления" open={openSections.notifications} onToggle={() => toggleSection('notifications')}>
        <Field label="Новый заказ">
          <Toggle checked={settings.emailNewOrder === 'true'} onChange={v => set('emailNewOrder', String(v))} />
        </Field>
        <Field label="Новый автор">
          <Toggle checked={settings.emailNewAuthor === 'true'} onChange={v => set('emailNewAuthor', String(v))} />
        </Field>
      </CollapsibleSection>

      {/* Категории */}
      <CollapsibleSection title="Категории" open={openSections.categories} onToggle={() => toggleSection('categories')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map(cat => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-bg2)',
              border: '1px solid var(--admin-border)',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
                {cat.emoji} {cat.name}
              </span>
              <button onClick={() => deleteCategory(cat.id)} disabled={deletingId === cat.id}
                style={{
                  background: 'none', border: 'none', cursor: deletingId === cat.id ? 'default' : 'pointer',
                  color: 'var(--admin-danger)', padding: '4px',
                  opacity: deletingId === cat.id ? 0.5 : 1,
                }}>
                <i className={`ti ${deletingId === cat.id ? 'ti-loader-2' : 'ti-trash'}`} style={{ fontSize: '16px' }} />
              </button>
            </div>
          ))}

          {/* Add category */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input style={{ ...inputStyle, maxWidth: '60px', textAlign: 'center' }}
              value={newCat.emoji} onChange={e => setNewCat(p => ({ ...p, emoji: e.target.value }))}
              placeholder="📦" />
            <input style={{ ...inputStyle, flex: 1, maxWidth: '280px' }}
              value={newCat.name} onChange={e => { setNewCat(p => ({ ...p, name: e.target.value })); setCategoryError('') }}
              placeholder="Название категории"
              onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button onClick={addCategory} disabled={addingCat || !newCat.name.trim()}
              style={{
                padding: '9px 16px', borderRadius: '10px', border: 'none',
                background: 'var(--admin-accent)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                opacity: addingCat || !newCat.name.trim() ? 0.6 : 1,
              }}>
              {addingCat ? 'Добавление...' : 'Добавить'}
            </button>
          </div>

          {categoryError && (
            <div style={{
              fontSize: '13px', color: 'var(--admin-danger)',
              background: 'rgba(239,56,38,0.08)', borderRadius: '10px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <i className="ti ti-alert-circle" style={{ fontSize: '15px' }} />{categoryError}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Технические */}
      <CollapsibleSection title="Технические" open={openSections.technical} onToggle={() => toggleSection('technical')}>
        <Field label="Режим обслуживания" hint="Сайт недоступен для пользователей">
          <Toggle checked={settings.maintenanceMode === 'true'} onChange={v => set('maintenanceMode', String(v))} />
        </Field>
      </CollapsibleSection>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={saveSettings} disabled={saving}
          style={{
            padding: '11px 28px', borderRadius: '10px', border: 'none',
            background: saved ? 'var(--admin-success)' : 'var(--admin-accent)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  )
}
