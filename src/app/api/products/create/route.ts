// src/app/api/products/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const ALLOWED_REVIT_VERSIONS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026']
const MAX_IMAGES = 10
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Берём роль из БД, а не из сессии — сессия могла закэшировать устаревшую роль
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { authorProfile: true },
    })

    if (!user || user.role !== 'author' || !user.authorProfile) {
      return NextResponse.json({ error: 'Доступ только для авторов' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, revitVersions, fileKey, fileName, categorySlug, imageKeys } = body

    // --- Валидация ---

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Название не должно превышать ${MAX_NAME_LENGTH} символов` }, { status: 400 })
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json({ error: 'Некорректное описание' }, { status: 400 })
      }
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return NextResponse.json({ error: `Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов` }, { status: 400 })
      }
    }

    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim().length === 0) {
      return NextResponse.json({ error: 'Файл обязателен' }, { status: 400 })
    }

    // fileName — опциональный, но если передан — должен быть строкой
    if (fileName !== undefined && typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Некорректное имя файла' }, { status: 400 })
    }

    if (price !== undefined && price !== null && price !== '') {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum < 0 || priceNum > 1_000_000) {
        return NextResponse.json({ error: 'Некорректная цена' }, { status: 400 })
      }
    }

    if (!Array.isArray(revitVersions) || revitVersions.length === 0) {
      return NextResponse.json({ error: 'Выберите хотя бы одну версию Revit' }, { status: 400 })
    }
    if (!revitVersions.every((v: unknown) => typeof v === 'string' && ALLOWED_REVIT_VERSIONS.includes(v))) {
      return NextResponse.json({ error: 'Недопустимая версия Revit' }, { status: 400 })
    }

    // categorySlug обязателен и не должен быть пустой строкой —
    // иначе findFirst({}) вернёт первую попавшуюся категорию
    if (!categorySlug || typeof categorySlug !== 'string' || categorySlug.trim().length === 0) {
      return NextResponse.json({ error: 'Категория обязательна' }, { status: 400 })
    }

    if (imageKeys !== undefined) {
      if (!Array.isArray(imageKeys) || imageKeys.length > MAX_IMAGES) {
        return NextResponse.json({ error: `Максимум ${MAX_IMAGES} изображений` }, { status: 400 })
      }
      if (!imageKeys.every((k: unknown) => typeof k === 'string')) {
        return NextResponse.json({ error: 'Некорректные ключи изображений' }, { status: 400 })
      }
    }

    // --- Конец валидации ---

    const category = await db.category.findUnique({
      where: { slug: categorySlug.trim() },
    })

    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })
    }

    const moderationStatus = user.authorProfile.autoPublish ? 'APPROVED' : 'PENDING'
    const isPublished = moderationStatus === 'APPROVED'

    const parsedPrice = price !== undefined && price !== null && price !== ''
      ? parseFloat(price)
      : null

    const product = await db.product.create({
      data: {
        name:          name.trim(),
        description:   description?.trim() || null,
        price:         parsedPrice && parsedPrice > 0 ? parsedPrice : null,
        revitVersions: revitVersions,
        isPublished,
        moderationStatus,
        isNew:         true,
        downloads:     0,
        categoryId:    category.id,
        authorId:      session.user.id,
        images:        imageKeys ?? [],
        bimParams:     JSON.stringify({ fileKey: fileKey.trim(), fileName: fileName ?? null, uploadedAt: new Date().toISOString() }),
      },
    })

    return NextResponse.json({ productId: product.id }, { status: 201 })

  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
