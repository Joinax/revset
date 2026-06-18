'use client'
// src/app/maintenance/page.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MaintenancePage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/maintenance-status')
        const { maintenance } = await res.json()
        if (!maintenance) router.replace('/')
      } catch {
        // сеть недоступна — попробуем снова
      }
    }

    // Проверяем каждые 5 секунд
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F6FA', fontFamily: 'Nunito Sans, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '40px 24px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px',
          background: 'rgba(72,128,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '36px',
        }}>
          🔧
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#202224', marginBottom: '12px' }}>
          Технические работы
        </h1>
        <p style={{ fontSize: '15px', color: '#848484', lineHeight: 1.6, marginBottom: '32px' }}>
          Сайт временно недоступен в связи с плановым обслуживанием.
          Мы скоро вернёмся — пожалуйста, зайдите позже.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '12px',
          background: '#fff', border: '1px solid #E0E0E0',
          fontSize: '13px', color: '#848484',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#FFA756', display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          Ведутся технические работы
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}
