// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import ProductClient from './ProductClient'
export { generateMetadata } from './metadata'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await db.product.findUnique({
    where: { id },
    include: {
      author:   { select: { id: true, name: true, authorProfile: true } },
      category: { select: { name: true, slug: true } },
      reviews:  { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!product) notFound()

  // Считаем средний рейтинг из реальных отзывов
  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : null

  return <ProductClient product={{ ...product, avgRating }} />
}