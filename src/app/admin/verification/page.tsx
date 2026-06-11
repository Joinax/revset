// src/app/admin/verification/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminVerificationClient from './AdminVerificationClient'

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params = await searchParams
  const status = params.status ?? 'pending'

  const where: any = {}
  if (status === 'pending')  where.isVerified = false
  if (status === 'verified') where.isVerified = true

  const authors = await db.authorProfile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true, createdAt: true,
          _count: { select: { products: true } },
        },
      },
    },
  })

  const [pendingCount, verifiedCount] = await Promise.all([
    db.authorProfile.count({ where: { isVerified: false } }),
    db.authorProfile.count({ where: { isVerified: true  } }),
  ])

  return (
    <AdminVerificationClient
      authors={authors.map(a => ({
        userId:        a.userId,
        name:          a.user.name,
        email:         a.user.email,
        image:         a.user.image,
        bio:           a.bio,
        city:          a.city,
        isVerified:    a.isVerified,
        autoPublish:   a.autoPublish,
        totalSales:    a.totalSales,
        totalRevenue:  a.totalRevenue,
        productsCount: a.user._count.products,
        registeredAt:  a.user.createdAt.toISOString(),
        createdAt:     a.createdAt.toISOString(),
      }))}
      pendingCount={pendingCount}
      verifiedCount={verifiedCount}
      currentStatus={status}
    />
  )
}
