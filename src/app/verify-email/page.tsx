// src/app/verify-email/page.tsx
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function VerifyEmailPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 24px', textAlign: 'center' }}>
        <i className="ti ti-mail" style={{ fontSize: '56px', color: 'var(--accent)', display: 'block', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '22px', marginBottom: '12px' }}>Подтвердите email</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '400px', lineHeight: 1.7, marginBottom: '24px' }}>
          Мы отправили письмо с подтверждением на вашу почту. Перейдите по ссылке в письме чтобы активировать аккаунт.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
          Не получили письмо? Проверьте папку «Спам».
        </p>
        <Link href="/login" className="btn-outline">Вернуться ко входу</Link>
      </div>
    </div>
  )
}
