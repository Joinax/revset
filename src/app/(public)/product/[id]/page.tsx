// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import ProductClient from './ProductClient'
export { generateMetadata } from './metadata'

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams

  const [product, session] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        author:   { select: { id: true, name: true, image: true, authorProfile: true } },
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
  let isInCart     = false
  const isOwnProduct = session?.user?.id === product.author.id

  if (session?.user) {
    const [order, favorite, cartItem] = await Promise.all([
      product.price !== null ? db.order.findFirst({
        where: { userId: session.user.id, status: 'PAID', items: { some: { productId: id } } },
      }) : null,
      db.favorite.findUnique({
        where: { userId_productId: { userId: session.user.id, productId: id } },
      }),
      product.price !== null ? db.cart.findFirst({
        where: { userId: session.user.id, items: { some: { productId: id } } },
      }) : null,
    ])
    isPurchased = !!order
    isFavorited = !!favorite
    isInCart    = !!cartItem
  }

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : null

  return (
    <ProductClient
      product={{ ...product, avgRating }}
      isPurchased={isPurchased}
      isFavorited={isFavorited}
      isInCart={isInCart}
      isOwnProduct={isOwnProduct}
      cameFromAccount={from}
    />
  )
}
