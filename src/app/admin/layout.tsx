// src/app/admin/layout.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminAuthGate from '@/components/admin/AdminAuthGate'
import AdminSWRProvider from '@/components/admin/AdminSWRProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/admin/login')

  // Роль и бан проверяем из БД — сессия может содержать устаревшую роль.
  // Это главный рубеж защиты всей админки — proxy.ts проверяет только cookie.
  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true, name: true, email: true },
  })

  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    redirect('/admin/login')
  }

  return (
    <>
      <style>{`
        .admin-root {
          --admin-bg-page: #F5F6FA;
          --admin-bg:      #FFFFFF;
          --admin-bg2:     #F5F6FA;
          --admin-border:  #E0E0E0;
          --admin-text:    #202224;
          --admin-muted:   #848484;
          --admin-accent:  #4880FF;
          --admin-success: #00B69B;
          --admin-danger:  #EF3826;
          --admin-warning: #FFA756;
          --admin-shadow:  0 6px 54px rgba(0,0,0,0.05);
          --admin-radius:  14px;
          font-family: var(--font-nunito), sans-serif;
        }
        .dark .admin-root {
          --admin-bg-page: #1C1C28;
          --admin-bg:      #242535;
          --admin-bg2:     #1C1C28;
          --admin-border:  rgba(255,255,255,0.08);
          --admin-text:    #EEEDF6;
          --admin-muted:   #72718A;
          --admin-accent:  #4880FF;
          --admin-success: #00B69B;
          --admin-danger:  #EF3826;
          --admin-warning: #FFA756;
          --admin-shadow:  0 6px 54px rgba(0,0,0,0.2);
          --admin-radius:  14px;
        }
        .admin-root h1 {
          font-family: var(--font-poppins), sans-serif;
          font-size: 32px; font-weight: 700;
          color: var(--admin-text); letter-spacing: -0.01em;
        }
        .admin-root h2 {
          font-family: var(--font-poppins), sans-serif;
          font-size: 24px; font-weight: 700; color: var(--admin-text);
        }
        .admin-root h3 {
          font-family: var(--font-poppins), sans-serif;
          font-size: 18px; font-weight: 700; color: var(--admin-text);
        }
      `}</style>

      <div className="admin-root" style={{ background: 'var(--admin-bg-page)', minHeight: '100vh' }}>
        <AdminSWRProvider>
          <AdminAuthGate currentUser={currentUser}>{children}</AdminAuthGate>
        </AdminSWRProvider>
      </div>
    </>
  )
}
