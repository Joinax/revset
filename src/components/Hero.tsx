import Link from 'next/link'

export default function Hero() {
  return (
    <>
      <section style={{
        padding: '72px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Фоновый градиент */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(41,82,200,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Тег-пилюля */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '5px 14px',
            fontSize: '12px', color: 'var(--muted)', marginBottom: '28px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
            }} />
            Только для Revit 2022–2025
          </div>

          {/* Заголовок */}
          <h1 style={{ marginBottom: '20px', lineHeight: 1.05 }}>
            Библиотека<br />
            BIM-семейств<br />
            для <span style={{ color: 'var(--accent)' }}>Revit</span>
          </h1>

          {/* Подзаголовок */}
          <p style={{
            color: 'var(--muted)', fontSize: '15px', lineHeight: 1.7,
            maxWidth: '500px', margin: '0 auto 36px',
          }}>
            Тысячи готовых RFA-моделей от российских авторов.
            Мебель, конструкции, инженерное оборудование — сразу в ваш проект.
          </p>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            <Link href="/catalog" className="btn-primary" style={{ padding: '13px 32px', fontSize: '14px' }}>
              Смотреть каталог
            </Link>
            <Link href="/for-authors" className="btn-outline" style={{ padding: '13px 32px', fontSize: '14px' }}>
              Загрузить свои модели
            </Link>
          </div>

          {/* Фичи */}
          <div style={{
            display: 'flex', gap: '24px', justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { icon: 'ti-file-3d',    text: 'Формат RFA'          },
              { icon: 'ti-shield-check', text: 'Проверенные модели' },
              { icon: 'ti-download',   text: 'Мгновенная загрузка' },
              { icon: 'ti-lock-open',  text: 'Лицензия включена'   },
            ].map(f => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', color: 'var(--muted)',
              }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: '14px', color: 'var(--accent)' }} />
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
