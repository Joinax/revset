// src/app/not-found.tsx
// Эта страница показывается автоматически когда вызывается notFound()

import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function NotFound() {
  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 60px)',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          {/* Большая цифра */}
          <div style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: '96px',
            fontWeight: 700,
            color: 'var(--bg3)',
            lineHeight: 1,
            marginBottom: '8px',
            userSelect: 'none',
          }}>
            404
          </div>

          {/* Иконка */}
          <div style={{
            fontSize: '48px',
            marginBottom: '24px',
          }}>
            🔍
          </div>

          {/* Заголовок */}
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '12px',
            letterSpacing: '-0.03em',
          }}>
            Страница не найдена
          </h1>

          {/* Описание */}
          <p style={{
            fontSize: '14px',
            color: 'var(--muted)',
            maxWidth: '360px',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}>
            Возможно, модель была удалена или ссылка устарела.
            Попробуйте найти нужное в каталоге.
          </p>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/catalog" className="btn-primary">
              Перейти в каталог
            </Link>
            <Link href="/" className="btn-outline">
              На главную
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
