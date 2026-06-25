import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminPackDetailClient from './AdminPackDetailClient'

export default async function AdminPackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { id } = await params

  const pack = await db.pack.findUnique({
    where: { id },
    include: {
      author:          { select: { id: true, name: true, email: true } },
      category:        { select: { name: true } },
      images:          { orderBy: { position: 'asc' } },
      exclusiveImages: { orderBy: { position: 'asc' } },
      products: {
        orderBy: { position: 'asc' },
        include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } },
      },
      reviews: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!pack) notFound()

  return (
    <AdminPackDetailClient
      pack={{
        ...pack,
        price:           Number(pack.price),
        images:          pack.images.map(i => i.key),
        exclusiveImages: pack.exclusiveImages.map(i => i.key),
        products:        pack.products.map(p => ({
          id: p.product.id, name: p.product.name,
          price: p.product.price ? Number(p.product.price) : null,
          moderationStatus: p.product.moderationStatus,
        })),
        reviews: pack.reviews.map(r => ({
          id:               r.id,
          rating:           r.rating,
          text:             r.text,
          moderationStatus: r.moderationStatus,
          createdAt:        r.createdAt.toISOString(),
          user:             { id: r.user.id, name: r.user.name },
        })),
        createdAt: pack.createdAt.toISOString(),
      }}
    />
  )
}
