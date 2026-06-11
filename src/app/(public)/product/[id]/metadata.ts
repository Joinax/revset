// src/app/product/[id]/metadata.ts
// Динамические мета-теги для карточки товара

import type { Metadata } from 'next'
import { db } from '@/lib/db'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  const product = await db.product.findUnique({
    where: { id },
    include: { author: { select: { name: true } }, category: { select: { name: true } } },
  })

  if (!product) {
    return {
      title: 'Товар не найден | REVSET',
    }
  }

  const title       = `${product.name} — RFA семейство для Revit | REVSET`
  const description = product.description
    ?? `BIM-семейство ${product.name} для Autodesk Revit. Категория: ${product.category.name}. Автор: ${product.author.name}.`

  const price = product.price !== null ? `${product.price} ₽` : 'Бесплатно'

  return {
    title,
    description,
    keywords: [
      product.name,
      'Revit семейство',
      'RFA скачать',
      product.category.name,
      'BIM библиотека',
      'Revit модель',
    ],
    openGraph: {
      title,
      description,
      type:     'website',
      locale:   'ru_RU',
      siteName: 'REVSET',
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
    other: {
      'product:price:amount':   product.price?.toString() ?? '0',
      'product:price:currency': 'RUB',
    },
  }
}
