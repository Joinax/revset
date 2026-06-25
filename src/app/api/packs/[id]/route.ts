// src/app/api/packs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { serializeDecimal } from '@/lib/serialize'

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
  price:         z.number().min(200).max(350000).optional(),
  categoryId:    z.string().optional(),
  hasExclusive:  z.boolean().optional(),
  exclusiveDesc: z.string().max(2000).optional().nullable(),
  productIds:    z.array(z.string()).min(2).max(12).optional(),
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

    const { productIds, ...rest } = parsed.data

    if (productIds) {
      const products = await db.product.findMany({
        where: { id: { in: productIds }, authorId: session.user.id, moderationStatus: 'APPROVED' },
        select: { id: true },
      })
      if (products.length !== productIds.length) {
        return NextResponse.json({ error: 'Все карточки должны быть одобрены и принадлежать вам' }, { status: 403 })
      }

      await db.packProduct.deleteMany({ where: { packId: id } })
      await db.packProduct.createMany({
        data: productIds.map((productId, position) => ({ packId: id, productId, position })),
      })
    }

    const updated = await db.pack.update({
      where: { id },
      data: {
        ...rest,
        name:        rest.name?.trim(),
        description: rest.description?.trim() || null,
      },
    })

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
