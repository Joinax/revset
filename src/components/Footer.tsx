// src/components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg2)',
      padding: '40px 24px 24px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Верхняя часть */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '32px',
          marginBottom: '32px',
        }}>

          {/* Логотип и описание */}
          <div>
            <div style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: '14px', fontWeight: 700, marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <img src="/revset_icon.svg" alt="REVSET" style={{ width: '24px', height: '24px' }} />
              <span><span style={{ color: 'var(--accent)' }}>REV</span><span style={{ color: 'var(--text)' }}>SET</span></span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Маркетплейс BIM-семейств для Autodesk Revit. Сделано в России.
            </p>
          </div>

          {/* Каталог */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Каталог
            </div>
            {[
              { href: '/catalog',                    label: 'Все модели'    },
              { href: '/catalog?category=furniture',  label: 'Мебель'        },
              { href: '/catalog?category=lighting',   label: 'Освещение'     },
              { href: '/catalog?category=engineering',label: 'Инженерия'     },
              { href: '/catalog?category=windows',    label: 'Окна и двери'  },
            ].map(link => (
              <Link key={link.href} href={link.href}
                style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', textDecoration: 'none' }}
                className="footer-link">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Компания */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Компания
            </div>
            {[
              { href: '/about',       label: 'О нас'       },
              { href: '/for-authors', label: 'Авторам'     },
              { href: '/faq',         label: 'FAQ'         },
            ].map(link => (
              <Link key={link.href} href={link.href}
                style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', textDecoration: 'none' }}
                className="footer-link">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Контакты */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Контакты
            </div>
            <Link href="mailto:support@revset.ru"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', textDecoration: 'none' }}
              className="footer-link">
              <i className="ti ti-mail" style={{ fontSize: '14px' }} />
              support@revset.ru
            </Link>
            <Link href="https://t.me/revset_support"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', textDecoration: 'none' }}
              className="footer-link">
              <i className="ti ti-brand-telegram" style={{ fontSize: '14px' }} />
              Telegram
            </Link>
          </div>
        </div>

        {/* Нижняя часть */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            © {new Date().getFullYear()} REVSET. Все права защищены.
          </span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/privacy" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }} className="footer-link">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }} className="footer-link">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--accent) !important; }
      `}</style>
    </footer>
  )
}
