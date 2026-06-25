// src/app/api/packs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { serializeDecimal } from '@/lib/serialize'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from '@/lib/queue'

type Params = { params: Promise<{ id: string }> }

async function getAuthorPack(packId: string, userId: string) {
  return db.pack.findFirst({
    where: { id: packId, authorId: userId },
    include: {
      products: { include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } }, orderBy: { position: 'asc' } },
      images:   { orderBy: { position: 'asc' } },
      exclusiveImages: { orderBy: { position: 'asc' } },
    },
  })
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdmin = currentUser.role === 'admin'
    const pack = isAdmin
      ? await db.pack.findUnique({
          where: { id },
          include: {
            author:   { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            products: { include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } }, orderBy: { position: 'asc' } },
            images:   { orderBy: { position: 'asc' } },
            exclusiveImages: { orderBy: { position: 'asc' } },
          },
        })
      : await getAuthorPack(id, session.user.id)

    if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(serializeDecimal(pack))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

const patchSchema = z.object({
  name:          z.string().min(1).max(200).optional(),
  description:   z.string().max(5000).optional().nullable(),
  price:         z.number().min(0).max(350000).optional(),
  categoryId:    z.string().optional(),
  hasExclusive:  z.boolean().optional(),
  exclusiveDesc: z.string().max(2000).optional().nullable(),
  productIds:    z.array(z.string()).min(2).max(12).optional(),
  submit:        z.boolean().optional(),
  // Изображения
  productImageKeys:       z.array(z.string()).max(12).optional(),
  keepImageKeys:          z.array(z.string()).max(6).optional(),
  newImageKeys:           z.array(z.string()).max(6).optional(),
  keepExclusiveImageKeys: z.array(z.string()).max(6).optional(),
  newExclusiveImageKeys:  z.array(z.string()).max(6).optional(),
  assemblyFileKey:        z.string().optional().nullable(),
  pdfKey:                 z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned || currentUser.role !== 'author') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pack = await db.pack.findFirst({ where: { id, authorId: session.user.id } })
    if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!['DRAFT', 'REJECTED'].includes(pack.moderationStatus)) {
      return NextResponse.json({ error: 'Редактирование возможно только для черновиков и отклонённых паков' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const {
      productIds, submit,
      productImageKeys, keepImageKeys, newImageKeys,
      keepExclusiveImageKeys, newExclusiveImageKeys,
      assemblyFileKey: newAssemblyKey, pdfKey: newPdfKey,
      ...rest
    } = parsed.data

    // Повторная отправка на модерацию — только из REJECTED
    if (submit === true && pack.moderationStatus !== 'REJECTED') {
      return NextResponse.json({ error: 'Повторная отправка возможна только для отклонённого пака' }, { status: 400 })
    }

    // Валидация новых temp-ключей
    if (newImageKeys?.length && !newImageKeys.every(k => k.startsWith('temp/images/'))) {
      return NextResponse.json({ error: 'Некорректные ключи изображений' }, { status: 400 })
    }
    if (newExclusiveImageKeys?.length && !newExclusiveImageKeys.every(k => k.startsWith('temp/images/'))) {
      return NextResponse.json({ error: 'Некорректные ключи превью' }, { status: 400 })
    }
    if (newAssemblyKey && !newAssemblyKey.startsWith('temp/rfa/')) {
      return NextResponse.json({ error: 'Некорректный ключ сборного файла' }, { status: 400 })
    }
    if (newPdfKey && !newPdfKey.startsWith('temp/pdf/')) {
      return NextResponse.json({ error: 'Некорректный ключ PDF' }, { status: 400 })
    }

    if (productIds) {
      const validProducts = await db.product.findMany({
        where: { id: { in: productIds }, authorId: session.user.id, moderationStatus: 'APPROVED' },
        select: { id: true, images: true },
      })
      if (validProducts.length !== productIds.length) {
        return NextResponse.json({ error: 'Все карточки должны быть одобрены и принадлежать вам' }, { status: 403 })
      }
      // Валидация productImageKeys
      if (productImageKeys?.length) {
        const validSet = new Set(validProducts.flatMap((p: { id: string; images: string[] }) => p.images))
        if (productImageKeys.some((k: string) => !validSet.has(k))) {
          return NextResponse.json({ error: 'Некорректные ключи изображений продуктов' }, { status: 400 })
        }
      }
    }

    // Кол-во новых файлов для сканирования
    const scanCount =
      (newImageKeys?.length ?? 0) +
      (newExclusiveImageKeys?.length ?? 0) +
      (newAssemblyKey ? 1 : 0) +
      (newPdfKey ? 1 : 0)

    const hasImageUpdate = productImageKeys !== undefined || keepImageKeys !== undefined || newImageKeys !== undefined
    const hasExclusiveUpdate = keepExclusiveImageKeys !== undefined || newExclusiveImageKeys !== undefined

    const updated = await db.$transaction(async (tx) => {
      // Обновление карточек в паке (diff)
      if (productIds) {
        const existing = await tx.packProduct.findMany({ where: { packId: id }, select: { productId: true } })
        const existingSet = new Set(existing.map(e => e.productId))
        const incomingSet = new Set(productIds)
        const toRemove = [...existingSet].filter(pid => !incomingSet.has(pid))
        const toAdd    = productIds.filter(pid => !existingSet.has(pid))
        if (toRemove.length > 0) await tx.packProduct.deleteMany({ where: { packId: id, productId: { in: toRemove } } })
        if (toAdd.length > 0) await tx.packProduct.createMany({ data: toAdd.map(pid => ({ packId: id, productId: pid, position: productIds.indexOf(pid) })) })
        for (const pid of productIds) {
          if (existingSet.has(pid)) {
            await tx.packProduct.update({ where: { packId_productId: { packId: id, productId: pid } }, data: { position: productIds.indexOf(pid) } })
          }
        }
      }

      // Обновление изображений пака
      if (hasImageUpdate) {
        await tx.packImage.deleteMany({ where: { packId: id } })
        const directImages: { packId: string; key: string; position: number }[] = []
        ;(productImageKeys ?? []).forEach((key: string, i: number) => directImages.push({ packId: id, key, position: i }))
        const offset = (productImageKeys ?? []).length
        ;(keepImageKeys ?? []).forEach((key: string, i: number) => directImages.push({ packId: id, key, position: offset + i }))
        if (directImages.length > 0) await tx.packImage.createMany({ data: directImages })
      }

      // Обновление эксклюзивных изображений
      if (hasExclusiveUpdate) {
        await tx.packExclusiveImage.deleteMany({ where: { packId: id } })
        const directExclusive: { packId: string; key: string; position: number }[] = []
        ;(keepExclusiveImageKeys ?? []).forEach((key: string, i: number) => directExclusive.push({ packId: id, key, position: i }))
        if (directExclusive.length > 0) await tx.packExclusiveImage.createMany({ data: directExclusive })
      }

      return tx.pack.update({
        where: { id },
        data: {
          ...rest,
          name:              rest.name?.trim(),
          description:       rest.description?.trim() || null,
          ...(newAssemblyKey === null && { assemblyFileKey: null }),
          ...(newPdfKey      === null && { pdfKey:          null }),
          ...(scanCount > 0 && { moderationStatus: 'PENDING_SCAN', pendingScanCount: scanCount }),
          ...(submit === true && scanCount === 0 && { moderationStatus: 'PENDING', moderationComment: null }),
        },
        include: {
          products: { include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } }, orderBy: { position: 'asc' } },
          images:          { orderBy: { position: 'asc' } },
          exclusiveImages: { orderBy: { position: 'asc' } },
        },
      })
    })

    // Ставим новые файлы в очередь сканирования
    if (scanCount > 0) {
      const queue = await getQueue()
      const jobs: ScanFileJob[] = []
      const imgOffset = (productImageKeys?.length ?? 0) + (keepImageKeys?.length ?? 0)
      newImageKeys?.forEach((fileKey: string, i: number) => {
        jobs.push({ fileKey, destKey: fileKey.replace('temp/images/', 'images/packs/'), entityType: 'pack', entityId: id, fieldName: 'packImage', position: imgOffset + i })
      })
      const exclOffset = keepExclusiveImageKeys?.length ?? 0
      newExclusiveImageKeys?.forEach((fileKey: string, i: number) => {
        jobs.push({ fileKey, destKey: fileKey.replace('temp/images/', 'images/packs/exclusive/'), entityType: 'pack', entityId: id, fieldName: 'packExclusiveImage', position: exclOffset + i })
      })
      if (newAssemblyKey) jobs.push({ fileKey: newAssemblyKey, destKey: newAssemblyKey.replace('temp/rfa/', 'rfa/packs/'), entityType: 'pack', entityId: id, fieldName: 'assemblyFileKey' })
      if (newPdfKey)      jobs.push({ fileKey: newPdfKey,      destKey: newPdfKey.replace('temp/pdf/', 'pdf/packs/'),         entityType: 'pack', entityId: id, fieldName: 'pdfKey' })
      for (const job of jobs) await queue.send(QUEUE_SCAN_FILE, job, { retryLimit: 2, retryDelay: 60 })
    }

    return NextResponse.json(serializeDecimal(updated))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned || currentUser.role !== 'author') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pack = await db.pack.findFirst({ where: { id, authorId: session.user.id } })
    if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!['DRAFT', 'REJECTED'].includes(pack.moderationStatus)) {
      return NextResponse.json({ error: 'Удаление возможно только для черновиков и отклонённых паков' }, { status: 400 })
    }

    await db.pack.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
