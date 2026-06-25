import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3Public, S3_BUCKET } from '@/lib/s3'

const DOWNLOAD_RATE_LIMIT = 5 // повторных скачиваний в час

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })

    const { packId } = await params

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pack = await db.pack.findUnique({
      where:   { id: packId },
      include: { products: { select: { productId: true } } },
    })
    if (!pack || pack.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Пак не найден' }, { status: 404 })
    }
    if (!pack.bundleKey) {
      return NextResponse.json({ error: 'Архив ещё формируется' }, { status: 404 })
    }

    const isAdmin = currentUser.role === 'admin'

    if (!isAdmin) {
      // Проверка доступа для платных паков
      if (Number(pack.price) > 0) {
        const order = await db.order.findFirst({
          where: { userId: session.user.id, status: 'PAID', items: { some: { packId } } },
        })
        if (!order) return NextResponse.json({ error: 'Необходимо купить пак' }, { status: 403 })
      }

      // Антифлуд: первое скачивание всегда разрешено.
      // Повторные — не чаще DOWNLOAD_RATE_LIMIT раз в час.
      const anyPrevious = await db.downloadLog.findFirst({
        where: { userId: session.user.id, packId },
      })
      if (anyPrevious) {
        const recentCount = await db.downloadLog.count({
          where: {
            userId:    session.user.id,
            packId,
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        })
        if (recentCount >= DOWNLOAD_RATE_LIMIT) {
          return NextResponse.json({ error: 'Слишком много запросов. Попробуйте через час.' }, { status: 429 })
        }
      }
    }

    // Имя файла: убираем символы которые ломают заголовок Content-Disposition
    const safeName = pack.name.replace(/[";\r\n]/g, '_')

    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        pack.bundleKey,
      ResponseContentDisposition: `attachment; filename="${safeName}.zip"`,
    })

    // Сначала генерируем ссылку — только потом пишем лог
    const downloadUrl = await getSignedUrl(s3Public, command, { expiresIn: 600 })

    if (!isAdmin) {
      await db.$transaction([
        db.downloadLog.create({ data: { userId: session.user.id, packId } }),
        ...pack.products.map(item =>
          db.downloadLog.create({ data: { userId: session.user.id, productId: item.productId } })
        ),
      ])
    }

    return NextResponse.json({ downloadUrl })
  } catch (err) {
    console.error('Pack download error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
