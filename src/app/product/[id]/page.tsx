// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import ProductClient from './ProductClient'
export { generateMetadata } from './metadata'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // ← в Next.js 16 params асинхронный

  const product = await db.product.findUnique({
    where: { id },
    include: {
      author:   { select: { id: true, name: true, authorProfile: true } },
      category: { select: { name: true, slug: true } },
      reviews:  { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!product) notFound()

  return <ProductClient product={product} />
}
