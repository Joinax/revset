// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,             lastModified: new Date(), changeFrequency: 'daily',   priority: 1    },
    { url: `${baseUrl}/catalog`, lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9  },
  ]

  // Динамические страницы товаров
  const products = await db.product.findMany({
    where:   { isPublished: true },
    select:  { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url:             `${baseUrl}/product/${p.id}`,
    lastModified:    p.updatedAt,
    changeFrequency: 'weekly',
    priority:        0.8,
  }))

  // Страницы авторов
  const authors = await db.user.findMany({
    where:  { role: 'author' },
    select: { id: true, updatedAt: true },
  })

  const authorPages: MetadataRoute.Sitemap = authors.map(a => ({
    url:             `${baseUrl}/author/${a.id}`,
    lastModified:    a.updatedAt,
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  return [...staticPages, ...productPages, ...authorPages]
}
