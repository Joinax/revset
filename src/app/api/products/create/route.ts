// src/app/api/products/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Проверяем что пользователь автор
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { authorProfile: true },
    })

    if (!user || user.role !== 'author' || !user.authorProfile) {
      return NextResponse.json({ error: 'Доступ только для авторов' }, { status: 403 })
    }

    const { name, description, price, revitVersions, fileKey, fileName, categorySlug, imageKeys } = await req.json()

    // Валидация
    if (!name || !fileKey) {
      return NextResponse.json({ error: 'Название и файл обязательны' }, { status: 400 })
    }
    if (!revitVersions || revitVersions.length === 0) {
      return NextResponse.json({ error: 'Выберите хотя бы одну версию Revit' }, { status: 400 })
    }

    // Находим категорию
    const category = await db.category.findFirst({
      where: categorySlug ? { slug: categorySlug } : {},
    })

    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })
    }

    // Определяем статус модерации в зависимости от настройки автора
    const moderationStatus = user.authorProfile.autoPublish ? 'APPROVED' : 'PENDING'
    const isPublished = moderationStatus === 'APPROVED'

    // Создаём товар в БД
    const product = await db.product.create({
      data: {
        name,
        description:   description || null,
        price:         price && parseFloat(price) > 0 ? parseFloat(price) : null,
        revitVersions: revitVersions || [],
        isPublished,
        moderationStatus,
        isNew:         true,
        downloads:     0,
        categoryId:    category.id,
        authorId:      session.user.id,
        images: imageKeys ?? [],
        // fileKey храним в bimParams
        bimParams: JSON.stringify({ fileKey, fileName }),
      },
    })

    return NextResponse.json({ productId: product.id }, { status: 201 })

  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
