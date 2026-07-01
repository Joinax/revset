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
  name:            z.string().min(1).max(200).optional(),
  description:     z.string().max(5000).optional().nullable(),
  price:           z.number().min(0).max(350000).optional(),
  categoryId:      z.string().optional(),
  productIds:      z.array(z.string()).min(2).max(12).optional(),
  submit:          z.boolean().optional(),
  unpublish:       z.boolean().optional(),
  productImageKeys: z.array(z.string()).max(12).optional(),
  keepImageKeys:   z.array(z.string()).max(6).optional(),
  newImageKeys:    z.array(z.string()).max(6).optional(),
  assemblyFileKey: z.string().optional().nullable(),
  pdfKey:          z.string().optional().nullable(),
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
    if (['PENDING', 'PENDING_SCAN', 'BUILDING_BUNDLE'].includes(pack.moderationStatus)) {
      return NextResponse.json({ error: 'Пак сейчас на модерации — дождитесь решения' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const {
      productIds, submit, unpublish,
      productImageKeys, keepImageKeys, newImageKeys,
      assemblyFileKey: newAssemblyKey, pdfKey: newPdfKey,
      ...rest
    } = parsed.data

    // Снятие с публикации — возвращает в черновик без модерации
    if (unpublish === true) {
      if (pack.moderationStatus !== 'APPROVED') {
        return NextResponse.json({ error: 'Снять с публикации можно только опубликованный пак' }, { status: 400 })
      }
      const updated = await db.pack.update({
        where: { id },
        data:  { moderationStatus: 'DRAFT' },
        include: {
          products: { include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } }, orderBy: { position: 'asc' } },
          images:   { orderBy: { position: 'asc' } },
        },
      })
      return NextResponse.json(serializeDecimal(updated))
    }

    if (submit === true && !['REJECTED', 'DRAFT'].includes(pack.moderationStatus)) {
      return NextResponse.json({ error: 'Отправка на проверку возможна только для черновиков и отклонённых паков' }, { status: 400 })
    }

    if (newImageKeys?.length && !newImageKeys.every(k => k.startsWith(`temp/images/${session.user.id}/`))) {
      return NextResponse.json({ error: 'Некорректные ключи изображений' }, { status: 400 })
    }
    if (newAssemblyKey && !newAssemblyKey.startsWith(`temp/rfa/${session.user.id}/`)) {
      return NextResponse.json({ error: 'Некорректный ключ сборного файла' }, { status: 400 })
    }
    if (newPdfKey && !newPdfKey.startsWith(`temp/pdf/${session.user.id}/`)) {
      return NextResponse.json({ error: 'Некорректный ключ PDF' }, { status: 400 })
    }

    if (productIds) {
      const validProducts = await db.product.findMany({
        where: { id: { in: productIds }, authorId: session.user.id, moderationStatus: 'APPROVED' },
        select: { id: true, images: true, price: true },
      })
      if (validProducts.length !== productIds.length) {
        return NextResponse.json({ error: 'Все карточки должны быть одобрены и принадлежать вам' }, { status: 403 })
      }
      if (productImageKeys?.length) {
        const validSet = new Set(validProducts.flatMap((p: { id: string; images: string[] }) => p.images))
        if (productImageKeys.some((k: string) => !validSet.has(k))) {
          return NextResponse.json({ error: 'Некорректные ключи изображений продуктов' }, { status: 400 })
        }
      }

      const paidPrices = validProducts
        .map(p => (p.price ? Number(p.price) : null))
        .filter((v): v is number => v !== null && v > 0)
      if (paidPrices.length > 0) {
        const minCardPrice = Math.min(...paidPrices)
        const effectivePrice = rest.price !== undefined ? rest.price : Number(pack.price)
        if (effectivePrice < minCardPrice) {
          return NextResponse.json(
            { error: `Пак содержит платные карточки. Минимальная цена пака: ${minCardPrice} ₽` },
            { status: 400 }
          )
        }
      }
    } else if (rest.price !== undefined) {
      const currentProducts = await db.product.findMany({
        where: { packs: { some: { packId: id } } },
        select: { price: true },
      })
      const paidPrices = currentProducts
        .map(p => (p.price ? Number(p.price) : null))
        .filter((v): v is number => v !== null && v > 0)
      if (paidPrices.length > 0) {
        const minCardPrice = Math.min(...paidPrices)
        if (rest.price < minCardPrice) {
          return NextResponse.json(
            { error: `Пак содержит платные карточки. Минимальная цена пака: ${minCardPrice} ₽` },
            { status: 400 }
          )
        }
      }
    }

    const scanCount = (newImageKeys?.length ?? 0) + (newAssemblyKey ? 1 : 0) + (newPdfKey ? 1 : 0)
    const hasImageUpdate = productImageKeys !== undefined || keepImageKeys !== undefined || newImageKeys !== undefined

    // Если пак был опубликован и автор вносит изменения без файлов — отправить на повторную модерацию
    const needsRemoderation = pack.moderationStatus === 'APPROVED' && scanCount === 0 && submit !== true

    const updated = await db.$transaction(async (tx) => {
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

      if (hasImageUpdate) {
        await tx.packImage.deleteMany({ where: { packId: id } })
        const directImages: { packId: string; key: string; position: number }[] = []
        ;(productImageKeys ?? []).forEach((key: string, i: number) => directImages.push({ packId: id, key, position: i }))
        const offset = (productImageKeys ?? []).length
        ;(keepImageKeys ?? []).forEach((key: string, i: number) => directImages.push({ packId: id, key, position: offset + i }))
        if (directImages.length > 0) await tx.packImage.createMany({ data: directImages })
      }

      return tx.pack.update({
        where: { id },
        data: {
          ...rest,
          name:        rest.name?.trim(),
          description: rest.description?.trim() || null,
          ...(newAssemblyKey === null && { assemblyFileKey: null }),
          ...(newPdfKey      === null && { pdfKey:          null }),
          ...(scanCount > 0 && { moderationStatus: 'PENDING_SCAN', pendingScanCount: scanCount }),
          ...(submit === true && scanCount === 0 && { moderationStatus: 'PENDING', moderationComment: null }),
          ...(needsRemoderation && { moderationStatus: 'PENDING', moderationComment: null }),
        },
        include: {
          products: { include: { product: { select: { id: true, name: true, price: true, moderationStatus: true } } }, orderBy: { position: 'asc' } },
          images:   { orderBy: { position: 'asc' } },
        },
      })
    })

    if (scanCount > 0) {
      const queue = await getQueue()
      const jobs: ScanFileJob[] = []
      const imgOffset = (productImageKeys?.length ?? 0) + (keepImageKeys?.length ?? 0)
      newImageKeys?.forEach((fileKey: string, i: number) => {
        jobs.push({ fileKey, destKey: fileKey.replace('temp/images/', 'images/packs/'), entityType: 'pack', entityId: id, fieldName: 'packImage', position: imgOffset + i })
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
