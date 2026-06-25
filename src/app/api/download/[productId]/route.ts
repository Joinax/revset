// src/app/api/download/[productId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3, S3_BUCKET } from '@/lib/s3'

const DOWNLOAD_RATE_LIMIT = 5 // повторных скачиваний в час

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await params

    // Роль берём из БД — сессия может содержать устаревшую роль.
    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const isAdmin = currentUser.role === 'admin'

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product || product.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    // Платные товары — только после PAID заказа или для администратора
    if (product.price !== null && !isAdmin) {
      const order = await db.order.findFirst({
        where: {
          userId: session.user.id,
          status: 'PAID',
          items:  { some: { productId } },
        },
      })
      if (!order) {
        return NextResponse.json({ error: 'Необходимо купить товар' }, { status: 403 })
      }
    }

    if (!isAdmin) {
      // Антифлуд: первое скачивание всегда разрешено.
      // Повторные — не чаще DOWNLOAD_RATE_LIMIT раз в час.
      const anyPrevious = await db.downloadLog.findFirst({
        where: { userId: session.user.id, productId },
      })
      if (anyPrevious) {
        const recentCount = await db.downloadLog.count({
          where: {
            userId:    session.user.id,
            productId,
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        })
        if (recentCount >= DOWNLOAD_RATE_LIMIT) {
          return NextResponse.json({ error: 'Слишком много запросов. Попробуйте через час.' }, { status: 429 })
        }
      }
    }

    // Имя файла: убираем символы которые ломают заголовок Content-Disposition
    const safeName = product.name.replace(/[";\r\n]/g, '_')

    let fileKey: string
    let disposition: string

    if (product.bundleKey) {
      // Карточка с PDF — отдаём ZIP-архив (RFA + инструкция)
      fileKey     = product.bundleKey
      disposition = `attachment; filename="${safeName}.zip"`
    } else {
      // Карточка без PDF — отдаём RFA/RVT напрямую
      if (!product.bimParams) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }
      let parsed: { fileKey?: string; rfaKey?: string; fileName?: string }
      try {
        const raw = product.bimParams
        parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof parsed)
      } catch {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }
      const key = parsed.rfaKey ?? parsed.fileKey
      if (!key) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }
      fileKey     = key
      disposition = `attachment; filename="${safeName}.rfa"`
    }

    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        fileKey,
      ResponseContentDisposition: disposition,
    })

    // Сначала генерируем ссылку — только потом пишем лог
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    if (!isAdmin) {
      db.downloadLog.create({ data: { userId: session.user.id, productId } })
        .catch(err => console.error('Failed to create download log:', err))

      db.product.update({
        where: { id: productId },
        data:  { downloads: { increment: 1 } },
      }).catch(err => console.error('Failed to increment downloads counter:', err))
    }

    return NextResponse.json({ downloadUrl })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
