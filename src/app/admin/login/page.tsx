import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminLoginClient from './AdminLoginClient'

export default async function AdminLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user) {
    // Проверяем статус в БД — session.user.role может быть устаревшим из JWT.
    // Без этой проверки возможен redirect-loop: layout.tsx (DB ≠ admin) → login → dashboard → layout → ...
    const dbUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (dbUser?.role === 'admin' && !dbUser.isBanned) {
      redirect('/admin/dashboard')
    }
  }

  return <AdminLoginClient />
}
