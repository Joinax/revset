// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем что товар принадлежит этому автору
    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }
    if (product.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { name, description, price, categorySlug, revitVersions, isPublished, fileKey, fileName } = await req.json()

    // Находим категорию
    const category = await db.category.findUnique({ where: { slug: categorySlug } })
    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })
    }

    // Обновляем товар
    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        description:   description || null,
        price:         price ? parseFloat(price) : null,
        categoryId:    category.id,
        revitVersions: revitVersions || [],
        isPublished:   isPublished ?? true,
        // Обновляем файл только если загрузили новый
        ...(fileKey && {
          bimParams: JSON.stringify({ fileKey, fileName }),
        }),
      },
    })

    return NextResponse.json({ productId: updated.id })

  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
