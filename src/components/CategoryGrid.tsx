// src/components/CategoryGrid.tsx
'use client'

import Link from 'next/link'

export type Category = {
  slug:   string
  name:   string
  count:  string
  emoji:  string
  iconBg: string
}

const ICONS: Record<string, JSX.Element> = {
  furniture:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18M3 9V6a1 1 0 011-1h16a1 1 0 011 1v3M3 9v9a1 1 0 001 1h1M21 9v9a1 1 0 01-1 1h-1M7 19v-4a1 1 0 011-1h8a1 1 0 011 1v4M7 19H5M17 19h2"/></svg>,
  plumbing:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  engineering: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  lighting:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a7 7 0 017 7c0 2.9-1.76 5.4-4.3 6.56L14 17H10l-.7-1.44A7 7 0 1112 2zM9 21h6M12 17v4"/></svg>,
  doors:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M4 22h16"/><circle cx="15" cy="12" r=".8" fill="currentColor"/></svg>,
  windows:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18M12 3v18"/></svg>,
  electrical:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  structures:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>,
  finishing:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>,
}

const FALLBACK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>

const ALL_DEFAULT: Category[] = [
  { slug: 'furniture',   name: 'Мебель',      count: '', emoji: '', iconBg: '' },
  { slug: 'plumbing',    name: 'Сантехника',  count: '', emoji: '', iconBg: '' },
  { slug: 'lighting',    name: 'Освещение',   count: '', emoji: '', iconBg: '' },
  { slug: 'doors',       name: 'Двери',       count: '', emoji: '', iconBg: '' },
  { slug: 'windows',     name: 'Окна',        count: '', emoji: '', iconBg: '' },
  { slug: 'electrical',  name: 'Электрика',   count: '', emoji: '', iconBg: '' },
  { slug: 'structures',  name: 'Конструкции', count: '', emoji: '', iconBg: '' },
  { slug: 'finishing',   name: 'Отделка',     count: '', emoji: '', iconBg: '' },
]

type Props = { title?: string; items?: Category[] }

export default function CategoryGrid({ title = 'Популярные категории', items = [] }: Props) {
  const realSlugs = new Set(items.map(i => i.slug))
  const extras    = ALL_DEFAULT.filter(d => !realSlugs.has(d.slug))
  const list      = [...items, ...extras].slice(0, 8)

  return (
    <>
      <section className="cats-section">
        <div className="cats-header">
          <h2 className="cats-title">{title}</h2>
          <Link href="/catalog" className="cats-see-all">Смотреть все</Link>
        </div>
        <div className="cats-row">
          {list.map(cat => (
            <Link key={cat.slug} href={`/catalog?category=${cat.slug}`} className="cat-card">
              <div className="cat-icon">{ICONS[cat.slug] ?? FALLBACK}</div>
              <span className="cat-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .cats-section { padding: 32px 0 8px; }
        .cats-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .cats-title { font-size: 20px; font-weight: 700; margin: 0; }
        .cats-see-all { font-size: 13px; color: var(--muted); text-decoration: none; transition: color 0.15s; }
        .cats-see-all:hover { color: var(--accent); }

        .cats-row {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }
        .cat-card {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px;
          background: var(--bg); border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          border-radius: 12px; padding: 20px 4px 14px;
          text-decoration: none; transition: all 0.18s;
        }
        .cat-card:hover {
          border-color: var(--accent); transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(41,82,200,0.12);
        }
        .cat-icon {
          width: 26px; height: 26px; color: var(--text); transition: color 0.18s; opacity: 0.7;
        }
        .cat-icon svg { width: 100%; height: 100%; }
        .cat-card:hover .cat-icon { color: var(--accent); opacity: 1; }
        .cat-name {
          font-size: 11px; font-weight: 500; color: var(--text);
          text-align: center; line-height: 1.3; padding: 0 4px;
        }

        @media (max-width: 900px)  { .cats-row { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 480px)  { .cats-row { grid-template-columns: repeat(4, 1fr); gap: 6px; } }
      `}</style>
    </>
  )
}
