// src/app/admin/users/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params = await searchParams
  const role = params.role ?? 'all'
  const q = params.q ?? ''
  const page = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 15

  const where: any = {}
  if (role !== 'all') where.role = role
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        authorProfile: { select: { isVerified: true, totalSales: true, totalRevenue: true } },
        _count: { select: { orders: true, products: true } },
      },
    }),
    db.user.count({ where }),
  ])

  return (
    <AdminUsersClient
      users={users.map(u => ({
        id:            u.id,
        name:          u.name,
        email:         u.email,
        role:          u.role,
        image:         u.image,
        createdAt:     u.createdAt.toISOString(),
        isVerified:    u.authorProfile?.isVerified ?? false,
        totalSales:    u.authorProfile?.totalSales ?? 0,
        totalRevenue:  u.authorProfile?.totalRevenue ?? 0,
        ordersCount:   u._count.orders,
        productsCount: u._count.products,
      }))}
      total={total}
      currentPage={page}
      perPage={PER_PAGE}
      currentRole={role}
      currentQ={q}
    />
  )
}
