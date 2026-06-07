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

  // Проверяем куплен ли товар текущим пользователем
  let isPurchased = false
  if (session?.user && product.price !== null) {
    const order = await db.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'PAID',
        items:  { some: { productId: id } },
      },
    })
    isPurchased = !!order
    console.log('user:', session?.user?.id)
    console.log('isPurchased:', isPurchased)
  }

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : null

  return <ProductClient product={{ ...product, avgRating }} isPurchased={isPurchased} />
}
