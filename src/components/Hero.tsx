import Link from 'next/link'

export default function Hero() {
  return (
    <>
      <section style={{
        padding: '56px 24px 48px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Тег-пилюля */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '5px 14px',
          fontSize: '12px',
          color: 'var(--muted)',
          marginBottom: '24px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse 2s infinite',
            flexShrink: 0,
          }} />
          Только для Revit 2022–2025
        </div>

        {/* Заголовок */}
        <h1 className="hero-title" style={{ marginBottom: '16px' }}>
          Библиотека<br />
          BIM-семейств<br />
          для <span>Revit</span>
        </h1>

        {/* Подзаголовок */}
        <p style={{
          color: 'var(--muted)',
          fontSize: '14px',
          lineHeight: 1.7,
          maxWidth: '480px',
          margin: '0 auto 32px',
        }}>
          Тысячи готовых RFA-моделей от российских авторов.
          Мебель, конструкции, инженерное оборудование — сразу в ваш проект.
        </p>

        {/* Кнопки */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link href="/catalog" className="btn-primary">
            Смотреть каталог
          </Link>
          <Link href="/for-authors" className="btn-outline">
            Загрузить свои модели
          </Link>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '16px',
          }}>
          <span style={{
            height: '1px',
            width: '40px',
            background: 'var(--bg3)',
            display: 'block'
          }}></span>
          <span style={{
            fontSize: '11px',
            color: 'var(--muted)',
            letterSpacing: '0.06em',
          }}>
            Загрузил · Открыл · Построил</span>
          <span style={{
            height: '1px',
            width: '40px',
            background: 'var(--bg3)',
            display: 'block'
          }}></span>
        </div>

      </section>

      

      <style>{`
        .hero-title {
          font-size: 34px;
        }
        @media (max-width: 480px) {
          .hero-title {
            font-size: 26px !important;
          }
        }
      `}</style>
    </>
  )
}
