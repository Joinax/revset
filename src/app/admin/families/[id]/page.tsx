// src/app/admin/families/[id]/page.tsx
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminFamilyDetailClient from './AdminFamilyDetailClient'

export default async function AdminFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const { id } = await params

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        author:   { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count:   { select: { reviews: true, orderItems: true } },
        reviews:  { select: { rating: true } },
      },
    }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
  ])

  if (!product) notFound()

  // Карточка недоступна для модерации пока файлы проверяются платформой
  // или если файл был отклонён из-за вируса (moderationComment содержит "Обнаружена угроза")
  const isBlocked =
    product.moderationStatus === 'PENDING_SCAN' ||
    (product.moderationStatus === 'REJECTED' && product.moderationComment?.startsWith('Обнаружена угроза'))

  const avgRating = product.reviews.length > 0
    ? Math.round(product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length * 10) / 10
    : null

  return (
    <AdminFamilyDetailClient
      product={{
        id:            product.id,
        name:          product.name,
        description:   product.description ?? '',
        price:         product.price != null ? String(product.price) : '',
        categorySlug:  product.category.slug,
        revitVersions: product.revitVersions,
        isPublished:   product.isPublished,
        moderationStatus:  product.moderationStatus,
        moderationComment: product.moderationComment,
        isBlocked: !!isBlocked,
        isNew:         product.isNew,
        downloads:     product.downloads,
        reviewCount:   product._count.reviews,
        salesCount:    product._count.orderItems,
        avgRating,
        createdAt:     product.createdAt.toISOString(),
        bimParams:     product.bimParams ?? '',
        images:        product.images ?? [],
        emoji:         product.previewEmoji ?? '📦',
        authorId:      product.author.id,
        authorName:    product.author.name,
        authorEmail:   product.author.email,
      }}
      categories={categories.map(c => ({ slug: c.slug, name: c.name }))}
    />
  )
}
