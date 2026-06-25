import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { serializeDecimal } from '@/lib/serialize'
import PackClient, { type PackClientPack } from './PackClient'

export default async function PackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  const pack = await db.pack.findUnique({
    where: { id },
    include: {
      author:   { select: { id: true, name: true, image: true } },
      category: { select: { id: true, name: true, slug: true } },
      images:   { orderBy: { position: 'asc' } },
      exclusiveImages: { orderBy: { position: 'asc' } },
      products: {
        orderBy: { position: 'asc' },
        include: {
          product: {
            select: {
              id: true, name: true, price: true,
              moderationStatus: true, images: true,
              previewEmoji: true, previewBg: true,
            },
          },
        },
      },
      reviews: {
        where: { moderationStatus: 'APPROVED' },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!pack || pack.moderationStatus !== 'APPROVED') notFound()

  // Fetch approved reviews from child products
  const productIds = pack.products.map(p => p.productId)
  const productReviews = await db.review.findMany({
    where: { productId: { in: productIds }, moderationStatus: 'APPROVED' },
    include: { user: { select: { name: true } }, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  let isPurchased = false
  let hasDownloaded = false
  let isOwnPack = false

  if (session?.user) {
    isOwnPack = pack.authorId === session.user.id
    const [order, downloadLog] = await Promise.all([
      Number(pack.price) > 0
        ? db.order.findFirst({
            where: { userId: session.user.id, status: 'PAID', items: { some: { packId: id } } },
          })
        : Promise.resolve(true), // free pack = always "purchased"
      db.downloadLog.findFirst({ where: { userId: session.user.id, packId: id } }),
    ])
    isPurchased = !!order
    hasDownloaded = !!downloadLog
  }

  // Sum of child product prices (current prices)
  const totalProductsPrice = pack.products.reduce((sum, p) => {
    return sum + (p.product.price ? Number(p.product.price) : 0)
  }, 0)
  const packPrice = Number(pack.price)
  const savings = totalProductsPrice > packPrice ? totalProductsPrice - packPrice : 0
  const savingsPct = totalProductsPrice > 0 ? Math.round(savings / totalProductsPrice * 100) : 0

  // serializeDecimal uses JSON.parse(JSON.stringify(...)) which converts Date→string and Decimal→number.
  // The generic T cannot express the Date→string change, so we cast to PackClientPack.
  const serializedPack = serializeDecimal({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    price: packPrice,
    pdfKey: pack.pdfKey,
    bundleKey: pack.bundleKey,
    hasExclusive: pack.hasExclusive,
    exclusiveDesc: pack.exclusiveDesc,
    images: pack.images.map(i => i.key),
    exclusiveImages: pack.exclusiveImages.map(i => i.key),
    products: pack.products.map(p => ({
      id: p.product.id,
      name: p.product.name,
      price: p.product.price ? Number(p.product.price) : null,
      isAvailable: p.product.moderationStatus === 'APPROVED',
      images: p.product.images,
      previewEmoji: p.product.previewEmoji,
      previewBg: p.product.previewBg,
    })),
    packReviews: pack.reviews.map(r => ({
      id: r.id, rating: r.rating, text: r.text ?? '',
      createdAt: r.createdAt, userName: r.user.name,
      source: 'pack' as const,
    })),
    productReviews: productReviews.map(r => ({
      id: r.id, rating: r.rating, text: r.text ?? '',
      createdAt: r.createdAt, userName: r.user.name,
      source: 'product' as const,
      productName: r.product.name,
    })),
    author: pack.author,
    category: pack.category,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as PackClientPack

  return (
    <PackClient
      pack={serializedPack}
      isPurchased={isPurchased}
      hasDownloaded={hasDownloaded}
      isOwnPack={isOwnPack}
      totalProductsPrice={totalProductsPrice}
      savings={savings}
      savingsPct={savingsPct}
    />
  )
}
