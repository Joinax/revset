// src/app/api/products/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from '@/lib/queue'
import { serializeDecimal } from '@/lib/serialize'

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

    const user = await db.user.findUnique({
      where:   { id: session.user.id },
      include: { authorProfile: true },
    })

    if (!user || user.role !== 'author' || !user.authorProfile) {
      return NextResponse.json({ error: 'Доступ только для авторов' }, { status: 403 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
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

    // fileKey должен принадлежать этому пользователю — namespace temp/rfa/{userId}/
    if (!fileKey.startsWith(`temp/rfa/${session.user.id}/`)) {
      return NextResponse.json({ error: 'Некорректный ключ файла' }, { status: 400 })
    }

    if (fileName !== undefined && typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Некорректное имя файла' }, { status: 400 })
    }

    if (price !== undefined && price !== null && price !== '') {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum < 200 || priceNum > 350_000) {
        return NextResponse.json({ error: 'Цена должна быть от 200 до 350 000 ₽' }, { status: 400 })
      }
    }

    if (!Array.isArray(revitVersions) || revitVersions.length === 0) {
      return NextResponse.json({ error: 'Выберите хотя бы одну версию Revit' }, { status: 400 })
    }
    if (!revitVersions.every((v: unknown) => typeof v === 'string' && ALLOWED_REVIT_VERSIONS.includes(v))) {
      return NextResponse.json({ error: 'Недопустимая версия Revit' }, { status: 400 })
    }

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
      // Изображения должны принадлежать этому пользователю — namespace temp/images/{userId}/
      if (!imageKeys.every((k: string) => k.startsWith(`temp/images/${session.user.id}/`))) {
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

    const parsedPrice = price !== undefined && price !== null && price !== ''
      ? parseFloat(price)
      : null

    // Считаем количество файлов которые уйдут на проверку
    const scanJobCount = 1 + (imageKeys?.length ?? 0) // 1 RFA + изображения

    // Товар создаётся со статусом PENDING_SCAN — файлы ещё проверяются ClamAV
    // Модератор не видит карточку пока все файлы не пройдут проверку
    const product = await db.product.create({
      data: {
        name:             name.trim(),
        description:      description?.trim() || null,
        price:            parsedPrice && parsedPrice > 0 ? parsedPrice : null,
        revitVersions,
        isPublished:      false,
        moderationStatus: 'PENDING_SCAN',
        pendingScanCount: scanJobCount,
        isNew:            true,
        downloads:        0,
        categoryId:       category.id,
        authorId:         session.user.id,
        images:           [],  // изображения добавятся после прохождения ClamAV
        bimParams:        JSON.stringify({
          fileName:   fileName ?? null,
          uploadedAt: new Date().toISOString(),
        }),
      },
    })

    // Ставим задачи в очередь ClamAV для всех файлов
    const queue = await getQueue()

    // RFA файл
    const rfaDestKey = fileKey.replace('temp/rfa/', 'rfa/')
    const rfaJob: ScanFileJob = {
      fileKey,
      destKey:    rfaDestKey,
      entityType: 'product',
      entityId:   product.id,
      fieldName:  'rfaKey',
    }
    await queue.send(QUEUE_SCAN_FILE, rfaJob, { retryLimit: 2, retryDelay: 60 })

    // Изображения
    if (imageKeys && imageKeys.length > 0) {
      for (const imgKey of imageKeys) {
        const imgDestKey = imgKey.replace('temp/images/', 'images/')
        const imgJob: ScanFileJob = {
          fileKey:    imgKey,
          destKey:    imgDestKey,
          entityType: 'product',
          entityId:   product.id,
          fieldName:  'images',
        }
        await queue.send(QUEUE_SCAN_FILE, imgJob, { retryLimit: 2, retryDelay: 60 })
      }
    }

    return NextResponse.json(serializeDecimal({ productId: product.id }), { status: 201 })

  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
