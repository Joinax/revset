// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import ProductClient from './ProductClient'
export { generateMetadata } from './metadata'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [product, session] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        author:   { select: { id: true, name: true, authorProfile: true } },
        category: { select: { name: true, slug: true } },
        reviews:  { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])

  if (!product) notFound()

  // Проверяем куплен ли товар и в избранном ли он
  let isPurchased  = false
  let isFavorited  = false

  if (session?.user) {
    const [order, favorite] = await Promise.all([
      product.price !== null ? db.order.findFirst({
        where: { userId: session.user.id, status: 'PAID', items: { some: { productId: id } } },
      }) : null,
      db.favorite.findUnique({
        where: { userId_productId: { userId: session.user.id, productId: id } },
      }),
    ])
    isPurchased = !!order
    isFavorited = !!favorite
  }

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : null

  return (
    <ProductClient
      product={{ ...product, avgRating }}
      isPurchased={isPurchased}
      isFavorited={isFavorited}
    />
  )
}
