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

    // Роль берём из БД, а не из сессии — сессия может содержать устаревшую роль.
    // Это критично: если пользователь подделал или перехватил сессию с чужой ролью
    // admin, он получит доступ к скачиванию без оплаты
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isBanned: true },
    })

    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const isAdmin = currentUser.role === 'admin'

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    // Бесплатные товары (price === null) доступны без оплаты
    // Платные товары — только после PAID заказа, либо для администратора
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

    if (!product.bimParams) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    let parsed: { fileKey?: string; rfaKey?: string; fileName?: string }
    try {
      parsed = JSON.parse(product.bimParams)
    } catch {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // rfaKey — новый формат (после ClamAV проверки)
    // fileKey — старый формат (обратная совместимость)
    const fileKey = parsed.rfaKey ?? parsed.fileKey
    if (!fileKey) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // Генерируем временную ссылку — действует 5 минут
    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        fileKey,
      ResponseContentDisposition: `attachment; filename="${product.name}.rfa"`,
    })

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    // Увеличиваем счётчик скачиваний — только для реальных покупателей,
    // не для администратора (его скачивание — проверка на модерации)
    if (!isAdmin) {
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
