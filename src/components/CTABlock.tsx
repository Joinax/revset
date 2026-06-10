// src/components/CTABlock.tsx
import Link from 'next/link'

type Props = {
  title?:       string
  description?: string
  buttonText?:  string
  buttonHref?:  string
}

export default function CTABlock({
  title       = 'Станьте автором на',
  description = 'Загружайте свои BIM-семейства и зарабатывайте на своих знаниях и опыте.',
  buttonText  = 'Стать автором',
  buttonHref  = '/for-authors',
}: Props) {
  return (
    <>
      <section className="cta-section">
        <div className="cta-dots" />

        <div className="cta-inner">
          {/* Левая — текст */}
          <div className="cta-left">
            <h2 className="cta-title">
              {title}{' '}
              <span className="cta-brand">
                <span style={{ color: 'var(--accent)' }}>REV</span><span className="cta-brand-set">SET</span>
              </span>
            </h2>
            <p className="cta-desc">{description}</p>

            <ul className="cta-perks">
              {[
                'Простая загрузка моделей',
                'Честные выплаты',
                'Поддержка экспертов',
                'Широкая аудитория',
              ].map(perk => (
                <li key={perk} className="cta-perk">
                  <i className="ti ti-circle-check" style={{ fontSize: '16px', color: 'var(--accent)', flexShrink: 0 }} />
                  {perk}
                </li>
              ))}
            </ul>

            <div className="cta-actions">
              <Link href={buttonHref} className="cta-btn-primary">{buttonText}</Link>
              <Link href="/for-authors" className="cta-btn-link">
                Узнать больше <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
              </Link>
            </div>
          </div>

          {/* Правая — ноутбук */}
          <div className="cta-right">
            <div className="cta-laptop">
              <div className="cta-screen">
                <div className="cta-screen-bar">
                  <span className="cta-screen-dot" style={{ background: '#ff5f57' }} />
                  <span className="cta-screen-dot" style={{ background: '#febc2e' }} />
                  <span className="cta-screen-dot" style={{ background: '#28c840' }} />
                </div>
                <div className="cta-screen-content">
                  <div className="cta-ui-card">
                    <div className="cta-ui-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="cta-ui-line" style={{ width: '60%', marginBottom: '4px' }} />
                      <div className="cta-ui-line" style={{ width: '40%', opacity: 0.5 }} />
                    </div>
                  </div>
                  <div className="cta-ui-card" style={{ marginTop: '8px' }}>
                    <div className="cta-ui-img" />
                    <div style={{ flex: 1 }}>
                      <div className="cta-ui-line" style={{ width: '70%', marginBottom: '4px' }} />
                      <div className="cta-ui-line cta-ui-price" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <div className="cta-ui-btn" />
                    <div className="cta-ui-btn" style={{ opacity: 0.4, flex: 1 }} />
                  </div>
                </div>
              </div>
              <div className="cta-laptop-stand" />
              <div className="cta-laptop-base" />
            </div>

            <div className="cta-float cta-float-1">
              <i className="ti ti-upload" style={{ fontSize: '16px', color: 'var(--accent)' }} />
              <span>Загружено</span>
            </div>
            <div className="cta-float cta-float-2">
              <i className="ti ti-currency-rubel" style={{ fontSize: '16px', color: '#1D9E75' }} />
              <span>+12 400 ₽</span>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .cta-section {
          margin: 40px 0 0;
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          background: var(--bg2);
          border: 1px solid var(--border);
        }

        /* Тёмная тема — насыщенный фон */
        .dark .cta-section {
          background: #0D0D1A;
          border-color: rgba(255,255,255,0.06);
        }

        .cta-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(var(--cta-dot-color, rgba(0,0,0,0.05)) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        .dark .cta-dots {
          --cta-dot-color: rgba(255,255,255,0.05);
        }

        .cta-inner {
          position: relative; z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 40px;
          padding: 44px 48px;
        }

        .cta-left { display: flex; flex-direction: column; }

        .cta-title {
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 800; line-height: 1.15;
          color: var(--text);
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .dark .cta-title { color: #fff; }

        .cta-brand {
          font-size: inherit;
          font-weight: 800;
        }
        .cta-brand-set { color: var(--text); }
        .dark .cta-brand-set { color: #fff; }

        .cta-desc {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .dark .cta-desc { color: rgba(255,255,255,0.5); }

        .cta-perks {
          list-style: none; padding: 0; margin: 0 0 20px;
          display: flex; flex-direction: column; gap: 9px;
        }
        .cta-perk {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: var(--text);
        }
        .dark .cta-perk { color: rgba(255,255,255,0.8); }

        .cta-actions { display: flex; align-items: center; gap: 20px; }

        .cta-btn-primary {
          display: inline-flex; align-items: center;
          background: var(--accent); color: #fff;
          border-radius: 10px; padding: 10px 22px;
          font-size: 14px; font-weight: 700;
          text-decoration: none; transition: opacity 0.15s;
        }
        .cta-btn-primary:hover { opacity: 0.88; }

        .cta-btn-link {
          display: flex; align-items: center; gap: 5px;
          font-size: 13px; color: var(--muted);
          text-decoration: none; transition: color 0.15s;
        }
        .cta-btn-link:hover { color: var(--text); }
        .dark .cta-btn-link:hover { color: #fff; }

        /* Ноутбук */
        .cta-right {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          padding: 20px 0;
        }
        .cta-laptop { position: relative; width: 240px; }

        .cta-screen {
          background: #1a1a2e;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px 12px 0 0;
          padding: 10px;
          min-height: 150px;
        }
        .cta-screen-bar { display: flex; gap: 5px; margin-bottom: 10px; }
        .cta-screen-dot { width: 8px; height: 8px; border-radius: 50%; }
        .cta-screen-content { padding: 4px; }

        .cta-ui-card {
          background: rgba(255,255,255,0.06);
          border-radius: 8px; padding: 10px;
          display: flex; align-items: center; gap: 10px;
        }
        .cta-ui-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
        .cta-ui-img { width: 32px; height: 32px; border-radius: 6px; background: rgba(255,255,255,0.15); flex-shrink: 0; }
        .cta-ui-line { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.2); }
        .cta-ui-price { width: 35%; background: var(--accent); opacity: 0.7; }
        .cta-ui-btn { flex: 1; height: 28px; border-radius: 6px; background: var(--accent); }

        .cta-laptop-stand { width: 60px; height: 8px; background: rgba(0,0,0,0.1); border-radius: 0 0 4px 4px; margin: 0 auto; }
        .dark .cta-laptop-stand { background: rgba(255,255,255,0.08); }
        .cta-laptop-base { width: 100%; height: 10px; background: rgba(0,0,0,0.07); border-radius: 0 0 8px 8px; }
        .dark .cta-laptop-base { background: rgba(255,255,255,0.05); }

        .cta-float {
          position: absolute;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 10px 14px;
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 600; color: var(--text);
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .dark .cta-float {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          border-color: rgba(255,255,255,0.12);
          color: #fff;
        }
        .cta-float-1 { top: 10px; left: -10px; }
        .cta-float-2 { bottom: 30px; right: -10px; }

        @media (max-width: 900px) {
          .cta-inner { grid-template-columns: 1fr; padding: 32px 24px; }
          .cta-right { display: none; }
        }
      `}</style>
    </>
  )
}
