// src/app/admin/orders/[id]/page.tsx
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminOrderDetailClient from './AdminOrderDetailClient'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      items: {
        include: {
          product: {
            select: { id: true, name: true, previewEmoji: true, previewBg: true, category: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!order) notFound()

  return (
    <AdminOrderDetailClient
      order={{
        id:          order.id,
        status:      order.status,
        totalAmount: Number(order.totalAmount),
        paymentId:   order.paymentId,
        createdAt:   order.createdAt.toISOString(),
        updatedAt:   order.updatedAt.toISOString(),
      }}
      user={{
        id:    order.user.id,
        name:  order.user.name,
        email: order.user.email,
        image: order.user.image,
      }}
      items={order.items.map(i => ({
        id:           i.id,
        productId:    i.productId ?? '',
        productName:  i.product?.name ?? '—',
        category:     i.product?.category.name ?? '—',
        emoji:        i.product?.previewEmoji ?? '📦',
        price:        Number(i.price),
      }))}
    />
  )
}
