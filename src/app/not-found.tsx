// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
          <div className="not-found-layout">

            {/* Левая — текст */}
            <div className="not-found-left">
              <div className="not-found-code">404</div>
              <h1 className="not-found-title">Страница не найдена</h1>
              <p className="not-found-desc">
                Запрашиваемая страница не существует или была перемещена.
              </p>
              <div className="not-found-actions">
                <Link href="/" className="not-found-btn-primary">Перейти на главную</Link>
                <Link href="/catalog" className="not-found-btn-outline">В каталог</Link>
              </div>
            </div>

            {/* Правая — SVG иллюстрация */}
            <div className="not-found-right" aria-hidden="true">
              <svg viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="not-found-svg">

                {/* Пол */}
                <ellipse cx="260" cy="410" rx="220" ry="16" fill="var(--nf-shadow)" />

                {/* ── Кресло ── */}
                {/* Ножки */}
                <rect x="148" y="330" width="14" height="52" rx="7" fill="var(--nf-wood)" />
                <rect x="196" y="330" width="14" height="52" rx="7" fill="var(--nf-wood)" />
                <rect x="268" y="330" width="14" height="52" rx="7" fill="var(--nf-wood)" />
                <rect x="316" y="330" width="14" height="52" rx="7" fill="var(--nf-wood)" />

                {/* Сиденье */}
                <rect x="132" y="292" width="208" height="50" rx="18" fill="var(--nf-chair)" />
                <rect x="132" y="292" width="208" height="16" rx="12" fill="var(--nf-chair-top)" />

                {/* Спинка */}
                <rect x="140" y="168" width="192" height="136" rx="22" fill="var(--nf-chair)" />
                <rect x="140" y="168" width="192" height="40" rx="22" fill="var(--nf-chair-top)" />

                {/* Подлокотники */}
                <rect x="118" y="240" width="28" height="72" rx="14" fill="var(--nf-chair-arm)" />
                <rect x="326" y="240" width="28" height="72" rx="14" fill="var(--nf-chair-arm)" />

                {/* Подушки */}
                <rect x="158" y="200" width="70" height="90" rx="14" fill="var(--nf-pillow)" opacity="0.7"/>
                <rect x="244" y="200" width="70" height="90" rx="14" fill="var(--nf-pillow)" opacity="0.55"/>

                {/* ── Торшер ── */}
                {/* Абажур */}
                <path d="M370 90 L420 90 L410 148 L380 148 Z" rx="4" fill="var(--nf-lamp)" />
                <rect x="370" y="82" width="50" height="12" rx="6" fill="var(--nf-lamp-top)" />
                {/* Свечение */}
                <ellipse cx="395" cy="160" rx="28" ry="8" fill="var(--nf-lamp)" opacity="0.18" />
                {/* Штанга */}
                <rect x="391" y="148" width="8" height="228" rx="4" fill="var(--nf-wood)" />
                {/* Основание */}
                <rect x="368" y="372" width="54" height="12" rx="6" fill="var(--nf-wood)" />
                <rect x="376" y="360" width="38" height="16" rx="6" fill="var(--nf-wood)" />

                {/* ── Растение ── */}
                {/* Горшок */}
                <path d="M82 348 L98 348 L94 384 L86 384 Z" fill="var(--nf-pot)" />
                <rect x="78" y="342" width="24" height="10" rx="5" fill="var(--nf-pot-rim)" />
                {/* Листья */}
                <ellipse cx="90" cy="310" rx="12" ry="34" fill="var(--nf-leaf)" transform="rotate(-20 90 310)" />
                <ellipse cx="96" cy="308" rx="11" ry="30" fill="var(--nf-leaf2)" transform="rotate(15 96 308)" />
                <ellipse cx="84" cy="316" rx="10" ry="26" fill="var(--nf-leaf)" transform="rotate(-40 84 316)" />
                <ellipse cx="102" cy="318" rx="9" ry="24" fill="var(--nf-leaf2)" transform="rotate(35 102 318)" />

                {/* Декор — маленькие точки */}
                <circle cx="60" cy="180" r="5" fill="var(--nf-dot)" opacity="0.35" />
                <circle cx="460" cy="240" r="4" fill="var(--nf-dot)" opacity="0.25" />
                <circle cx="440" cy="80" r="6" fill="var(--nf-dot)" opacity="0.2" />
                <circle cx="76" cy="240" r="3" fill="var(--nf-dot)" opacity="0.3" />
              </svg>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .not-found-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          min-height: calc(100vh - 64px);
          gap: 40px;
          padding: 60px 0;
        }

        .not-found-left {
          display: flex;
          flex-direction: column;
        }

        .not-found-code {
          font-size: clamp(96px, 14vw, 160px);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.05em;
          color: var(--text);
          margin-bottom: 16px;
          font-family: var(--font-unbounded, sans-serif);
        }

        .not-found-title {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          color: var(--text);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .not-found-desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.65;
          margin: 0 0 36px;
          max-width: 380px;
        }

        .not-found-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .not-found-btn-primary {
          display: inline-flex; align-items: center;
          background: var(--accent); color: #fff;
          border-radius: 10px; padding: 12px 28px;
          font-size: 14px; font-weight: 700;
          text-decoration: none;
          transition: opacity .15s, transform .15s;
        }
        .not-found-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        .not-found-btn-outline {
          display: inline-flex; align-items: center;
          background: transparent; color: var(--text);
          border: 1.5px solid var(--border);
          border-radius: 10px; padding: 12px 28px;
          font-size: 14px; font-weight: 600;
          text-decoration: none;
          transition: border-color .15s, color .15s;
        }
        .not-found-btn-outline:hover { border-color: var(--accent); color: var(--accent); }

        .not-found-right {
          display: flex; align-items: center; justify-content: center;
        }

        .not-found-svg {
          width: 100%;
          max-width: 480px;
          height: auto;
        }

        /* Цвета иллюстрации — светлая тема */
        :root {
          --nf-shadow:      rgba(0,0,0,0.07);
          --nf-chair:       #E2DEFA;
          --nf-chair-top:   #C9C2F0;
          --nf-chair-arm:   #C9C2F0;
          --nf-pillow:      #A78BFA;
          --nf-wood:        #C8A87A;
          --nf-lamp:        #A78BFA;
          --nf-lamp-top:    #7C3AED;
          --nf-pot:         #D4845A;
          --nf-pot-rim:     #E8A07A;
          --nf-leaf:        #4BAD64;
          --nf-leaf2:       #38924E;
          --nf-dot:         #A78BFA;
        }

        /* Тёмная тема */
        .dark {
          --nf-shadow:      rgba(0,0,0,0.25);
          --nf-chair:       #2D2850;
          --nf-chair-top:   #231E42;
          --nf-chair-arm:   #231E42;
          --nf-pillow:      #4F3A9E;
          --nf-wood:        #8B6040;
          --nf-lamp:        #6D28D9;
          --nf-lamp-top:    #5B21B6;
          --nf-pot:         #9B5030;
          --nf-pot-rim:     #B06040;
          --nf-leaf:        #2A7A3C;
          --nf-leaf2:       #1E5C2C;
          --nf-dot:         #6D28D9;
        }

        @media (max-width: 768px) {
          .not-found-layout { grid-template-columns: 1fr; text-align: center; padding: 40px 0; }
          .not-found-right { display: none; }
          .not-found-actions { justify-content: center; }
          .not-found-desc { max-width: 100%; }
        }

        @media (max-width: 640px) {
          .not-found-layout { padding: 0 0 40px; }
        }
      `}</style>
    </>
  )
}
