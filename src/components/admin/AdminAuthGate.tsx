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

  return (
    <>
      <AdminSidebar />
      <div style={{ marginLeft: '72px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopbar currentUser={currentUser} />
        {/*
          Сайдбар (72px) уже "съедает" часть левого пространства экрана.
          Компенсируем зрительный сдвиг, добавляя доп. правый паддинг
          в половину ширины сайдбара (36px) — так контент визуально
          оказывается ближе к центру всего экрана, а не только этой области.
        */}
        <main style={{ flex: 1, padding: '32px 76px 32px 40px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: '1100px', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
