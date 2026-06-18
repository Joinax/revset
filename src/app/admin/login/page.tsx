// src/app/admin/login/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminLoginClient from './AdminLoginClient'

export default async function AdminLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  return <AdminLoginClient />
}
