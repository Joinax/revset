// src/app/admin/transactions/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminTransactionsClient from './AdminTransactionsClient'

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; userId?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params = await searchParams
  const status = params.status ?? 'all'
  const q      = params.q      ?? ''
  const userId = params.userId ?? ''
  const page   = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 15

  const where: any = {}
  if (status !== 'all') where.status = status
  if (userId) where.userId = userId
  if (q) {
    where.OR = [
      { user: { name:  { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  // Если фильтруем по пользователю — подгружаем его имя для баннера
  let filterUserName = ''
  if (userId) {
    const filterUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    filterUserName = filterUser?.name ?? ''
  }

  const [orders, total, stats] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user:  { select: { name: true, email: true, image: true } },
        items: { include: { product: { select: { name: true } } }, take: 3 },
      },
    }),
    db.order.count({ where }),
    db.order.aggregate({
      where: { status: 'PAID' },
      _sum:   { totalAmount: true },
      _count: { id: true },
    }),
  ])

  return (
    <AdminTransactionsClient
      orders={orders.map(o => ({
        id:          o.id,
        userName:    o.user.name,
        userEmail:   o.user.email,
        userImage:   o.user.image,
        status:      o.status,
        totalAmount: Number(o.totalAmount),
        itemCount:   o.items.length,
        itemNames:   o.items.map(i => i.product.name),
        createdAt:   o.createdAt.toISOString(),
      }))}
      total={total}
      currentPage={page}
      perPage={PER_PAGE}
      currentStatus={status}
      currentQ={q}
      currentUserId={userId}
      currentUserName={filterUserName}
      totalRevenue={stats._sum.totalAmount ? Number(stats._sum.totalAmount) : 0}
      totalPaid={stats._count.id}
    />
  )
}
