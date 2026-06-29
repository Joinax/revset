'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ProductCard, type Product } from '@/components/ProductCard'

export default function TrendingCarousel({ products }: { products: Product[] }) {
  const trackRef  = useRef<HTMLDivElement>(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update])

  function scroll(dir: 'left' | 'right') {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? el.clientWidth : -el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Трек */}
      <div
        ref={trackRef}
        onScroll={update}
        className="trending-track"
      >
        {products.map(p => (
          <div key={p.id} className="trending-item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Кнопка влево */}
      {canLeft && (
        <button onClick={() => scroll('left')} className="trending-btn trending-btn-left" aria-label="Назад">
          <i className="ti ti-chevron-left" style={{ fontSize: '18px' }} />
        </button>
      )}

      {/* Кнопка вправо */}
      {canRight && (
        <button onClick={() => scroll('right')} className="trending-btn trending-btn-right" aria-label="Вперёд">
          <i className="ti ti-chevron-right" style={{ fontSize: '18px' }} />
        </button>
      )}

      <style>{`
        .trending-track {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .trending-track::-webkit-scrollbar { display: none; }

        .trending-item {
          flex: 0 0 calc((100% - 64px) / 5);
          scroll-snap-align: start;
          min-width: 0;
        }

        .trending-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg2);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          transition: background 0.15s, box-shadow 0.15s;
        }
        .trending-btn:hover {
          background: var(--bg3, var(--bg2));
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        }
        .trending-btn-left  { left:  -18px; }
        .trending-btn-right { right: -18px; }

        @media (max-width: 900px) {
          .trending-item { flex: 0 0 calc((100% - 48px) / 4); }
        }
        @media (max-width: 640px) {
          .trending-item { flex: 0 0 calc((100% - 16px) / 2); }
          .trending-btn-left  { left:  4px; }
          .trending-btn-right { right: 4px; }
        }
      `}</style>
    </div>
  )
}
