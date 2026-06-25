// src/app/api/download/[productId]/pdf/route.ts
// Отдельное скачивание PDF-инструкции — доступно после первого скачивания карточки
import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3, S3_BUCKET } from '@/lib/s3'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })

    const { productId } = await params

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product || product.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }
    if (!product.pdfKey) {
      return NextResponse.json({ error: 'PDF не доступен' }, { status: 404 })
    }

    const isAdmin = currentUser.role === 'admin'

    if (!isAdmin) {
      const isPaid = product.price !== null

      if (isPaid) {
        // Платная карточка: нужна покупка И хотя бы одно скачивание
        const [order, downloaded] = await Promise.all([
          db.order.findFirst({
            where: { userId: session.user.id, status: 'PAID', items: { some: { productId } } },
          }),
          db.downloadLog.findFirst({ where: { userId: session.user.id, productId } }),
        ])
        if (!order || !downloaded) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // Бесплатная карточка: нужно хотя бы одно скачивание
        const downloaded = await db.downloadLog.findFirst({
          where: { userId: session.user.id, productId },
        })
        if (!downloaded) {
          return NextResponse.json({ error: 'Сначала скачайте модель' }, { status: 403 })
        }
      }
    }

    // Имя файла: убираем символы которые ломают заголовок Content-Disposition
    const safeName = product.name.replace(/[";\r\n]/g, '_')

    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        product.pdfKey,
      ResponseContentDisposition: `attachment; filename="${safeName}.pdf"`,
    })
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    return NextResponse.json({ downloadUrl })
  } catch (err) {
    console.error('Product PDF download error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
