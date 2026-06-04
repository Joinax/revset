'use client'

// ── ТИПЫ ───────────────────────────────────────────────────────────────
export type Filters = {
  categories: string[]
  revitVersions: string[]
  priceType: string[]   // 'free' | 'paid'
  priceMin: string
  priceMax: string
}

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
}

// ── ОПЦИИ ФИЛЬТРОВ ──────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'furniture',   label: 'Мебель',       count: '3 840' },
  { value: 'engineering', label: 'Инженерия',     count: '2 210' },
  { value: 'lighting',    label: 'Освещение',     count: '1 560' },
  { value: 'windows',     label: 'Окна / двери',  count: '980'   },
  { value: 'structures',  label: 'Конструкции',   count: '740'   },
]

const REVIT_VERSIONS = ['Revit 2025', 'Revit 2024', 'Revit 2023', 'Revit 2022']

// ── ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: ЧЕКБОКС ─────────────────────────────────
function Checkbox({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  count?: string
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '7px',
      cursor: 'pointer',
    }}>
      {/* Кастомный чекбокс из дизайна */}
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: '15px',
          height: '15px',
          borderRadius: '3px',
          border: checked ? 'none' : '1.5px solid var(--border)',
          background: checked ? 'var(--accent)' : 'var(--bg2)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
          cursor: 'pointer',
        }}
      >
        {checked && (
          <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }} />
        )}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{label}</span>
      {count && (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{count}</span>
      )}
    </label>
  )
}

// ── ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: ЗАГОЛОВОК СЕКЦИИ ─────────────────────────
function FilterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--muted)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

// ── ОСНОВНОЙ КОМПОНЕНТ ──────────────────────────────────────────────────
export default function FilterSidebar({ filters, onChange }: Props) {

  // Хелпер: переключить значение в массиве
  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value)
      ? arr.filter(v => v !== value)
      : [...arr, value]
  }

  return (
    <div style={{ padding: '20px' }}>

      {/* ── Категория ── */}
      <div style={{ marginBottom: '22px' }}>
        <FilterTitle>Категория</FilterTitle>
        {CATEGORIES.map(cat => (
          <Checkbox
            key={cat.value}
            checked={filters.categories.includes(cat.value)}
            onChange={() => onChange({ ...filters, categories: toggle(filters.categories, cat.value) })}
            label={cat.label}
            count={cat.count}
          />
        ))}
      </div>

      {/* ── Версия Revit ── */}
      <div style={{ marginBottom: '22px' }}>
        <FilterTitle>Версия Revit</FilterTitle>
        {REVIT_VERSIONS.map(ver => (
          <Checkbox
            key={ver}
            checked={filters.revitVersions.includes(ver)}
            onChange={() => onChange({ ...filters, revitVersions: toggle(filters.revitVersions, ver) })}
            label={ver}
          />
        ))}
      </div>

      {/* ── Цена ── */}
      <div style={{ marginBottom: '22px' }}>
        <FilterTitle>Цена</FilterTitle>
        <Checkbox
          checked={filters.priceType.includes('free')}
          onChange={() => onChange({ ...filters, priceType: toggle(filters.priceType, 'free') })}
          label="Бесплатные"
        />
        <Checkbox
          checked={filters.priceType.includes('paid')}
          onChange={() => onChange({ ...filters, priceType: toggle(filters.priceType, 'paid') })}
          label="Платные"
        />

        {/* Диапазон цен */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            type="number"
            placeholder="от"
            value={filters.priceMin}
            onChange={e => onChange({ ...filters, priceMin: e.target.value })}
            style={{
              flex: 1, width: 0,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: 'var(--text)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <input
            type="number"
            placeholder="до"
            value={filters.priceMax}
            onChange={e => onChange({ ...filters, priceMax: e.target.value })}
            style={{
              flex: 1, width: 0,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: 'var(--text)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={() => onChange({ ...filters })}
          style={{
            width: '100%',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          Применить
        </button>
      </div>

      {/* Сбросить всё */}
      <button
        onClick={() => onChange({
          categories: [],
          revitVersions: [],
          priceType: ['free', 'paid'],
          priceMin: '',
          priceMax: '',
        })}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '4px 0',
          textAlign: 'left',
        }}
      >
        Сбросить фильтры
      </button>
    </div>
  )
}
