// src/app/api/download/[productId]/route.ts
// Генерирует временную ссылку для скачивания файла — только после оплаты
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
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { productId } = await params

    // Проверяем что товар куплен
    const order = await db.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'PAID',
        items:  { some: { productId } },
      },
    })

    // Бесплатные товары можно скачать без оплаты
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    if (product.price !== null && !order) {
      return NextResponse.json({ error: 'Необходимо купить товар' }, { status: 403 })
    }

    if (!product.bimParams) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // fileKey хранится в поле bimParams
    const { fileKey } = JSON.parse(product.bimParams)
    if (!fileKey) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // Генерируем временную ссылку на скачивание — действует 5 минут
    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        fileKey,
      ResponseContentDisposition: `attachment; filename="${product.name}.rfa"`,
    })

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    return NextResponse.json({ downloadUrl })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
