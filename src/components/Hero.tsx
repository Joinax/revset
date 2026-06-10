// src/components/Hero.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from './ThemeProvider'

export default function Hero() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/catalog?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <h1 className="hero-h1">
              Профессиональные<br />
              BIM-семейства<br />
              для ваших проектов
            </h1>
            <p className="hero-sub">
              Экономьте время на моделировании.<br />
              Используйте готовые решения от экспертов.
            </p>
            <div className="hero-btns">
              <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
              <Link href="/for-authors" className="btn-outline">Стать автором</Link>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-photo-wrap">
              {/* Светлая картинка */}
              <Image
                src="/hero-light.jpg"
                alt="Интерьер"
                className="hero-photo-img"
                width={800}
                height={600}
                priority
                style={{ opacity: isDark ? 0 : 1 }}
              />
              {/* Тёмная картинка */}
              <Image
                src="/hero-dark.jpg"
                alt="Интерьер"
                className="hero-photo-img hero-photo-img-dark"
                width={800}
                height={600}
                priority
                style={{ opacity: isDark ? 1 : 0 }}
              />
            </div>
          </div>
        </div>

        <div className="hero-search-row">
          <div className="hero-search-glow" />
          <form className="hero-search" onSubmit={handleSearch}>
            <i className="ti ti-search" style={{ fontSize: '18px', flexShrink: 0, color: 'inherit', opacity: 0.5 }} />
            <input
              className="hero-search-input"
              placeholder="Поиск семейств для Revit..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="hero-search-btn">
              <i className="ti ti-search" />
              <span className="hero-search-btn-text">Найти</span>
            </button>
          </form>
        </div>
      </section>

      <style>{`
        .hero { background: var(--bg); }

        .hero-inner,
        .hero-search-row {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px;
        }

        .hero-inner {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 40px;
          align-items: center;
          padding-top: 0;
          padding-bottom: 36px;
        }

        .hero-left { display: flex; flex-direction: column; }

        .hero-h1 {
          font-size: 40px;
          font-weight: 800;
          line-height: 1.1;
          color: var(--text);
          margin: 0 0 16px;
          letter-spacing: -0.02em;
        }

        .hero-sub {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.7;
          margin: 0 0 28px;
        }

        .hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        /* Фото */
        .hero-right { position: relative; }

        .hero-photo-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
        }

        .hero-photo-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity 0.5s ease;
        }

        /* Наложение второго изображения поверх */
        .hero-photo-img-dark {
          z-index: 1;
        }

        /* Плавное затухание слева и снизу */
        .hero-photo-wrap::before {
          content: '';
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(to right, var(--bg) 0%, transparent 15%);
        }
        .hero-photo-wrap::after {
          content: '';
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(to top, var(--bg) 0%, transparent 25%);
        }

        /* Поиск */
        .hero-search-row {
          padding-bottom: 20px;
          position: relative;
        }

        .hero-search-glow {
          position: absolute;
          inset: 4px 32px;
          background: linear-gradient(135deg, rgba(41,82,200,0.25) 0%, rgba(91,78,223,0.2) 50%, rgba(41,82,200,0.15) 100%);
          border-radius: 28px;
          filter: blur(24px);
          z-index: 0;
          pointer-events: none;
        }
        .dark .hero-search-glow {
          background: linear-gradient(135deg, rgba(79,110,247,0.3) 0%, rgba(139,127,255,0.2) 50%, rgba(79,110,247,0.2) 100%);
        }

        .hero-search {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.92);
          color: #111;
          border: 1.5px solid transparent;
          background-clip: padding-box;
          border-radius: 14px;
          padding: 8px 8px 8px 20px;
          box-shadow:
            0 0 0 1.5px rgba(79,110,247,0.4),
            0 8px 32px rgba(41,82,200,0.2),
            inset 0 1px 0 rgba(255,255,255,0.06);
          transition: box-shadow 0.2s;
        }
        .hero-search:focus-within {
          box-shadow:
            0 0 0 2px rgba(79,110,247,0.7),
            0 12px 40px rgba(41,82,200,0.3),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .hero-search-input {
          flex: 1; border: none; outline: none;
          font-size: 15px; color: #111;
          background: transparent; font-family: inherit; padding: 10px 0;
        }
        .hero-search-input::placeholder { color: rgba(0,0,0,0.35); }

        .hero-search-btn {
          background: var(--accent); color: #fff; border: none;
          border-radius: 10px; padding: 0 20px; height: 44px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          cursor: pointer; font-size: 14px; font-weight: 700;
          transition: opacity 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .hero-search-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .hero-search-btn-text { font-family: inherit; }

        .dark .hero-search {
          background: rgba(255,255,255,0.92);
          color: #111;
          box-shadow:
            0 0 0 1.5px rgba(79,110,247,0.5),
            0 8px 32px rgba(79,110,247,0.25),
            0 2px 8px rgba(0,0,0,0.3);
        }
        .dark .hero-search:focus-within {
          box-shadow:
            0 0 0 2px rgba(79,110,247,0.8),
            0 12px 48px rgba(79,110,247,0.35),
            0 2px 8px rgba(0,0,0,0.3);
        }
        .dark .hero-search-input { color: #111; }
        .dark .hero-search-input::placeholder { color: rgba(0,0,0,0.35); }

        @media (max-width: 900px) {
          .hero-inner, .hero-search-row { padding-left: 16px; padding-right: 16px; }
          .hero-inner { grid-template-columns: 1fr; }
          .hero-right { display: none; }
          .hero-h1 { font-size: 28px; }
        }
      `}</style>
    </>
  )
}
