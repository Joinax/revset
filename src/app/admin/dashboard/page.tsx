// src/app/admin/dashboard/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalUsers,
    totalProducts,
    publishedProducts,
    pendingVerification,
    ordersThisMonth,
    ordersLastMonth,
    recentOrders,
    // График продаж за последние 30 дней
    last30DaysOrders,
  ] = await Promise.all([
    db.user.count(),
    db.product.count(),
    db.product.count({ where: { isPublished: true } }),
    db.authorProfile.count({ where: { isVerified: false } }),
    db.order.aggregate({
      where: { status: 'PAID', createdAt: { gte: startOfMonth } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: { status: 'PAID', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.order.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),
    db.order.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Группируем продажи по дням для графика
  const salesByDay: Record<string, number> = {}
  for (const order of last30DaysOrders) {
    const day = order.createdAt.toISOString().split('T')[0]
    salesByDay[day] = (salesByDay[day] ?? 0) + Number(order.totalAmount)
  }
  const chartData = Object.entries(salesByDay).map(([date, amount]) => ({ date, amount }))

  const revenueThisMonth = ordersThisMonth._sum.totalAmount ? Number(ordersThisMonth._sum.totalAmount) : 0
  const revenueLastMonth = ordersLastMonth._sum.totalAmount ? Number(ordersLastMonth._sum.totalAmount) : 0
  const revenueChange = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : 0

  return (
    <AdminDashboardClient
      stats={{
        totalUsers,
        totalProducts,
        publishedProducts,
        pendingVerification,
        revenueThisMonth,
        revenueChange,
        ordersThisMonth: ordersThisMonth._count.id,
      }}
      chartData={chartData}
      recentOrders={recentOrders.map(o => ({
        id: o.id,
        userName: o.user.name,
        userEmail: o.user.email,
        amount: Number(o.totalAmount),
        productName: o.items[0]?.product.name ?? '—',
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  )
}
