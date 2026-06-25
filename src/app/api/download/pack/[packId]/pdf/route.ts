// src/app/api/download/pack/[packId]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3Public, S3_BUCKET } from '@/lib/s3'

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

    const pack = await db.pack.findUnique({ where: { id: packId } })
    if (!pack || pack.moderationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Пак не найден' }, { status: 404 })
    }
    if (!pack.pdfKey) {
      return NextResponse.json({ error: 'PDF не доступен' }, { status: 404 })
    }

    const isAdmin = currentUser.role === 'admin'
    const isFree = Number(pack.price) === 0

    if (!isFree && !isAdmin) {
      // Must have purchased AND downloaded at least once
      const [order, downloaded] = await Promise.all([
        db.order.findFirst({
          where: { userId: session.user.id, status: 'PAID', items: { some: { packId } } },
        }),
        db.downloadLog.findFirst({ where: { userId: session.user.id, packId } }),
      ])
      if (!order || !downloaded) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const command = new GetObjectCommand({
      Bucket:                     S3_BUCKET,
      Key:                        pack.pdfKey,
      ResponseContentDisposition: `attachment; filename="${pack.name}.pdf"`,
    })
    const downloadUrl = await getSignedUrl(s3Public, command, { expiresIn: 600 })

    return NextResponse.json({ downloadUrl })
  } catch (err) {
    console.error('Pack PDF download error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
