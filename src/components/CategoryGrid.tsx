'use client'

import Link from 'next/link'

export type Category = {
  slug: string
  name: string
  count: string
  emoji: string
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
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 24px 16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em',
        }}>
          {title}
        </span>
        <Link href="/catalog" style={{ fontSize: '12px', color: 'var(--muted)' }} className="see-all-link">
          Все категории →
        </Link>
      </div>

      <div className="cats-grid" style={{ padding: '0 24px 32px' }}>
        {items.map(cat => (
          <Link
            key={cat.slug}
            href={`/catalog?category=${cat.slug}`}
            className="cat-card"
            style={{
              display: 'block', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: '10px',
              padding: '16px 14px', textDecoration: 'none', transition: 'border-color 0.2s',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: cat.iconBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', marginBottom: '10px',
            }}>
              {cat.emoji}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px', color: 'var(--text)' }}>
              {cat.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {cat.count}
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .cat-card:hover  { border-color: rgba(41, 82, 200, 0.3) !important; }
        .see-all-link:hover { color: var(--accent) !important; }
      `}</style>
    </section>
  )
}
