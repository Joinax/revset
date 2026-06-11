// src/app/about/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'О нас | REVSET',
  description: 'REVSET — российский маркетплейс BIM-семейств для Autodesk Revit.',
}

const STATS = [
  { value: '12 400+', label: 'RFA-семейств'  },
  { value: '890',     label: 'Авторов'        },
  { value: '45 000+', label: 'Пользователей'  },
  { value: '2024',    label: 'Год основания'  },
]

const VALUES = [
  { icon: 'ti-shield-check', title: 'Качество',         desc: 'Каждая модель проходит проверку перед публикацией.' },
  { icon: 'ti-users',        title: 'Сообщество',       desc: 'Мы строим профессиональное сообщество BIM-специалистов.' },
  { icon: 'ti-map-pin',      title: 'Сделано в России', desc: 'Серверы, хранилище и команда — всё в России.' },
  { icon: 'ti-heart',        title: 'Поддержка',        desc: 'Отвечаем на вопросы в течение нескольких часов.' },
]

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ padding: '64px 24px 48px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ marginBottom: '16px' }}>
          О <span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
          Мы создали первый российский маркетплейс BIM-семейств для Autodesk Revit — место где авторы продают свои модели, а специалисты находят всё необходимое для проектов.
        </p>
      </section>

      {/* Статистика */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', maxWidth: '640px', margin: '0 auto' }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Миссия */}
      <section style={{ padding: '0 24px 48px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(41,82,200,0.06) 0%, rgba(91,78,223,0.04) 100%)', border: '1px solid rgba(41,82,200,0.15)', borderRadius: '16px', padding: '32px' }}>
          <h2 style={{ marginBottom: '16px' }}>Наша миссия</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '16px' }}>
            BIM-проектирование становится стандартом в строительной отрасли России. Мы хотим чтобы каждый архитектор, конструктор и инженер имел доступ к качественным Revit-семействам — быстро, удобно и по честной цене.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8 }}>
            Авторам мы даём возможность монетизировать свои знания и опыт, предлагая лучшие условия на рынке — 80% с каждой продажи.
          </p>
        </div>
      </section>

      {/* Ценности */}
      <section style={{ padding: '0 24px 48px', maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Наши ценности</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(41,82,200,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <i className={`ti ${v.icon}`} style={{ fontSize: '20px', color: 'var(--accent)' }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{v.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 24px 64px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/catalog"     className="btn-primary">Перейти в каталог</Link>
          <Link href="/for-authors" className="btn-outline">Стать автором</Link>
        </div>
      </section>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
