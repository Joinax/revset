// src/app/author-dashboard/edit/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import EditProductClient from './EditProductClient'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!product) notFound()

  // Только автор товара может редактировать
  if (product.authorId !== session.user.id) redirect('/author-dashboard')

  const categories = await db.category.findMany({ orderBy: { order: 'asc' } })

  return (
    <EditProductClient
      product={{
        id:           product.id,
        name:         product.name,
        description:  product.description ?? '',
        price:        product.price?.toString() ?? '',
        isPublished:  product.isPublished,
        categorySlug: product.category.slug,
        revitVersions: product.revitVersions,
        bimParams:    product.bimParams ?? '',
      }}
      categories={categories.map(c => ({ slug: c.slug, name: c.name }))}
    />
  )
}
