// src/app/api/packs/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from '@/lib/queue'
import { serializeDecimal } from '@/lib/serialize'

const createPackSchema = z.object({
  name:               z.string().min(1).max(200),
  description:        z.string().max(5000).optional().nullable(),
  price:              z.number().min(0).max(350000),
  categoryId:         z.string().min(1),
  productIds:         z.array(z.string()).min(2).max(12),
  hasExclusive:       z.boolean().default(false),
  exclusiveDesc:      z.string().max(2000).optional().nullable(),
  productImageKeys:   z.array(z.string()).max(12).default([]),  // уже финальные ключи из продуктов
  imageKeys:          z.array(z.string()).max(6).default([]),   // новые temp-загрузки
  exclusiveImageKeys: z.array(z.string()).max(6).optional().default([]),
  assemblyFileKey:    z.string().optional().nullable(),
  pdfKey:             z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned || currentUser.role !== 'author') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = createPackSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description, price, categoryId, productIds, hasExclusive,
            exclusiveDesc, productImageKeys, imageKeys, exclusiveImageKeys, assemblyFileKey, pdfKey } = parsed.data

    if (productImageKeys.length + imageKeys.length < 1) {
      return NextResponse.json({ error: 'Необходимо хотя бы одно изображение' }, { status: 400 })
    }
    // Validate temp key prefixes for new uploads
    if (imageKeys.length && !imageKeys.every(k => k.startsWith('temp/images/'))) {
      return NextResponse.json({ error: 'Некорректные ключи изображений' }, { status: 400 })
    }
    if (exclusiveImageKeys.length && !exclusiveImageKeys.every(k => k.startsWith('temp/images/'))) {
      return NextResponse.json({ error: 'Некорректные ключи превью' }, { status: 400 })
    }
    if (assemblyFileKey && !assemblyFileKey.startsWith('temp/rfa/')) {
      return NextResponse.json({ error: 'Некорректный ключ сборного файла' }, { status: 400 })
    }
    if (pdfKey && !pdfKey.startsWith('temp/pdf/')) {
      return NextResponse.json({ error: 'Некорректный ключ PDF' }, { status: 400 })
    }

    // hasExclusive requires assemblyFileKey and exclusiveDesc
    if (hasExclusive && !assemblyFileKey) {
      return NextResponse.json({ error: 'Эксклюзив требует сборный RVT файл' }, { status: 400 })
    }
    if (hasExclusive && !exclusiveDesc?.trim()) {
      return NextResponse.json({ error: 'Укажите описание эксклюзивного контента' }, { status: 400 })
    }

    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })

    // All products must be APPROVED and owned by this author
    const products = await db.product.findMany({
      where: { id: { in: productIds }, authorId: session.user.id, moderationStatus: 'APPROVED' },
      select: { id: true, images: true },
    })
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Все карточки должны быть одобрены и принадлежать вам' }, { status: 403 })
    }

    // Validate productImageKeys belong to these products
    if (productImageKeys.length > 0) {
      const validProductImageSet = new Set(products.flatMap((p: { id: string; images: string[] }) => p.images))
      if (productImageKeys.some((k: string) => !validProductImageSet.has(k))) {
        return NextResponse.json({ error: 'Некорректные ключи изображений продуктов' }, { status: 400 })
      }
    }

    // scanJobCount — только новые temp-файлы
    const scanJobCount =
      imageKeys.length +
      exclusiveImageKeys.length +
      (assemblyFileKey ? 1 : 0) +
      (pdfKey ? 1 : 0)

    // Если нет новых файлов для сканирования — сразу PENDING, иначе PENDING_SCAN
    const initialStatus = scanJobCount > 0 ? 'PENDING_SCAN' : 'PENDING'

    const pack = await db.pack.create({
      data: {
        name:             name.trim(),
        description:      description?.trim() || null,
        price,
        categoryId,
        authorId:         session.user.id,
        hasExclusive,
        exclusiveDesc:    hasExclusive ? exclusiveDesc?.trim() || null : null,
        moderationStatus: initialStatus,
        pendingScanCount: scanJobCount,
        products: {
          create: productIds.map((productId, position) => ({ productId, position })),
        },
      },
    })

    // imageKeys (загруженные автором) идут первыми — они станут обложкой
    // productImageKeys (авто из карточек) идут после
    if (productImageKeys.length > 0) {
      await db.packImage.createMany({
        data: productImageKeys.map((key: string, i: number) => ({ packId: pack.id, key, position: imageKeys.length + i })),
      })
    }

    const queue = await getQueue()
    const jobs: ScanFileJob[] = []

    // Загруженные фото — позиции 0..N (первые, обложка)
    imageKeys.forEach((fileKey, i) => {
      const position = i
      const destKey = fileKey.replace('temp/images/', 'images/packs/')
      jobs.push({ fileKey, destKey, entityType: 'pack', entityId: pack.id, fieldName: 'packImage', position })
    })

    exclusiveImageKeys.forEach((fileKey, position) => {
      const destKey = fileKey.replace('temp/images/', 'images/packs/exclusive/')
      jobs.push({ fileKey, destKey, entityType: 'pack', entityId: pack.id, fieldName: 'packExclusiveImage', position })
    })

    if (assemblyFileKey) {
      const destKey = assemblyFileKey.replace('temp/rfa/', 'rfa/packs/')
      jobs.push({ fileKey: assemblyFileKey, destKey, entityType: 'pack', entityId: pack.id, fieldName: 'assemblyFileKey' })
    }

    if (pdfKey) {
      const destKey = pdfKey.replace('temp/pdf/', 'pdf/packs/')
      jobs.push({ fileKey: pdfKey, destKey, entityType: 'pack', entityId: pack.id, fieldName: 'pdfKey' })
    }

    for (const job of jobs) {
      await queue.send(QUEUE_SCAN_FILE, job, { retryLimit: 2, retryDelay: 60 })
    }

    return NextResponse.json(serializeDecimal({ packId: pack.id }), { status: 201 })

  } catch (error) {
    console.error('Create pack error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
