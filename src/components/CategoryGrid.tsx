'use client'

import Link from 'next/link'

export type Category = {
  slug:   string
  name:   string
  count:  string
  emoji:  string
  iconBg: string
}

const categories: Category[] = [
  { slug: 'furniture',   name: 'Мебель',       count: '3 840 моделей', emoji: '🪑', iconBg: '#1C2A10' },
  { slug: 'engineering', name: 'Инженерия',    count: '2 210 моделей', emoji: '🔧', iconBg: '#101C2A' },
  { slug: 'lighting',    name: 'Освещение',    count: '1 560 моделей', emoji: '💡', iconBg: '#1C1020' },
  { slug: 'windows',     name: 'Окна и двери', count: '980 моделей',   emoji: '🪟', iconBg: '#1C1C10' },
]

type Props = {
  title?: string
  items?: Category[]
}

export default function CategoryGrid({ title = 'Категории', items = categories }: Props) {
  return (
    <section style={{ padding: '0 24px 8px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '32px 0 20px',
      }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>{title}</h2>
        <Link href="/catalog" style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }} className="see-all-link">
          Все категории <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
        </Link>
      </div>

      <div className="cats-grid">
        {items.map(cat => (
          <Link
            key={cat.slug}
            href={`/catalog?category=${cat.slug}`}
            className="cat-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: cat.iconBg,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '22px',
              flexShrink: 0,
            }}>
              {cat.emoji}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                {cat.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {cat.count}
              </div>
            </div>
            <i className="ti ti-arrow-right" style={{ fontSize: '16px', color: 'var(--muted)', marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>

      <style>{`
        .cat-card:hover { border-color: var(--accent) !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(41,82,200,0.1); }
        .see-all-link:hover { color: var(--accent) !important; }
      `}</style>
    </section>
  )
}
