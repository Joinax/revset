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

  const [product, session, productPacks] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        author:   { select: { id: true, name: true, image: true, authorProfile: { select: { bio: true, city: true, isVerified: true, totalSales: true } } } },
        category: { select: { name: true, slug: true } },
        reviews: {
          include: {
            user:     { select: { name: true } },
            comments: {
              where:   { moderationStatus: 'APPROVED' },
              include: { author: { select: { name: true, image: true } } },
            },
            likes: { select: { authorId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
    db.packProduct.findMany({
      where: { productId: id, pack: { moderationStatus: 'APPROVED' } },
      include: {
        pack: {
          select: {
            id: true, name: true, price: true,
            images: { orderBy: { position: 'asc' as const }, take: 1 },
            products: { include: { product: { select: { price: true } } } },
          },
        },
      },
    }),
  ])

  if (!product) notFound()

  // Compute savings per pack
  const packsWithSavings = productPacks.map(pp => {
    const totalProductsPrice = pp.pack.products.reduce(
      (sum, p) => sum + (p.product.price ? Number(p.product.price) : 0), 0
    )
    const packPrice = Number(pp.pack.price)
    const savingsPct = totalProductsPrice > 0
      ? Math.round((totalProductsPrice - packPrice) / totalProductsPrice * 100) : 0
    return { id: pp.pack.id, name: pp.pack.name, price: packPrice, savingsPct, coverImage: pp.pack.images[0]?.key ?? null }
  })

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

  // Показываем только одобренные отзывы + отзыв текущего пользователя (в любом статусе)
  const visibleReviews = product.reviews.filter(r =>
    r.moderationStatus === 'APPROVED' ||
    (session?.user && r.userId === session.user.id)
  )

  // Комментарий автора к отзывам (включая на модерации — для самого автора)
  const productAuthorId = product.author.id

  const avgRating = product.reviews.filter(r => r.moderationStatus === 'APPROVED').length > 0
    ? product.reviews.filter(r => r.moderationStatus === 'APPROVED').reduce((sum, r) => sum + r.rating, 0) / product.reviews.filter(r => r.moderationStatus === 'APPROVED').length
    : null

  return (
    <ProductClient
      product={{
        ...product,
        price:    product.price    !== null ? Number(product.price)    : null,
        priceOld: product.priceOld !== null ? Number(product.priceOld) : null,
        reviews:  visibleReviews,
        avgRating,
      }}
      isPurchased={isPurchased}
      isFavorited={isFavorited}
      isInCart={isInCart}
      isOwnProduct={isOwnProduct}
      cameFromAccount={from}
      currentUserId={session?.user?.id ?? null}
      packsWithSavings={packsWithSavings}
    />
  )
}
