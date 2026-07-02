'use client'
// src/components/admin/AdminAuthGate.tsx
import { usePathname } from 'next/navigation'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

// Страница входа в админку не должна иметь sidebar/topbar
const BARE_PATHS = ['/admin/login']

type CurrentUser = { name: string; email: string } | null

export default function AdminAuthGate({
  children,
  currentUser,
}: {
  children: React.ReactNode
  currentUser: CurrentUser
}) {
  const pathname = usePathname()

  if (BARE_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  // Support ticket detail pages need a full-height chat layout — no main padding
  const isFullHeight = /^\/admin\/support\/.+/.test(pathname)

  return (
    <>
      <AdminSidebar />
      <div style={{ marginLeft: '72px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopbar currentUser={currentUser} />
        {isFullHeight ? (
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 76px 0 40px' }}>
            <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {children}
            </div>
          </main>
        ) : (
          <main style={{ flex: 1, padding: '32px 76px 32px 40px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: '1100px', width: '100%' }}>
              {children}
            </div>
          </main>
        )}
      </div>
    </>
  )
}
