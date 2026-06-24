// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3, S3_BUCKET } from '@/lib/s3'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10 МБ
const MAX_RFA_SIZE   = 50 * 1024 * 1024  // 50 МБ

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Роль берём из БД — сессия может содержать устаревшую роль.
    // Загрузка файлов доступна только авторам, не покупателям.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isBanned: true },
    })

    if (!user || user.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    if (user.role !== 'author' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ только для авторов' }, { status: 403 })
    }

    const uploadSchema = z.object({
      fileName:   z.string().min(1).max(255),
      fileType:   z.string().min(1).max(100),
      fileSize:   z.number().positive().finite(),
      uploadType: z.enum(['rfa', 'image']),
    })

    let fileName: string, fileType: string, fileSizeNum: number, uploadType: 'rfa' | 'image'
    try {
      const result = uploadSchema.safeParse(await req.json())
      if (!result.success) {
        return NextResponse.json(
          { error: 'Некорректные параметры', details: result.error.flatten().fieldErrors },
          { status: 400 }
        )
      }
      ;({ fileName, fileType, fileSize: fileSizeNum, uploadType } = result.data)
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    let fileKey = ''
    let maxSize = 0

    if (uploadType === 'rfa') {
      if (!fileName.toLowerCase().endsWith('.rfa')) {
        return NextResponse.json({ error: 'Разрешены только файлы .rfa' }, { status: 400 })
      }
      if (fileSizeNum > MAX_RFA_SIZE) {
        return NextResponse.json({ error: 'RFA файл не должен превышать 50 МБ' }, { status: 400 })
      }
      // fileType для .rfa не проверяем по MIME — браузеры отдают разные значения
      // для .rfa, важно только расширение
      fileKey = `rfa/${session.user.id}/${randomUUID()}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      maxSize = MAX_RFA_SIZE

    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return NextResponse.json({ error: 'Разрешены только JPG, PNG, WebP' }, { status: 400 })
      }
      if (fileSizeNum > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Изображение не должно превышать 10 МБ' }, { status: 400 })
      }
      fileKey = `images/${session.user.id}/${randomUUID()}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      maxSize = MAX_IMAGE_SIZE
    }

    const command = new PutObjectCommand({
      Bucket:        S3_BUCKET,
      Key:           fileKey,
      ContentType:   fileType,
      // ContentLength в presigned URL для PutObject ограничивает размер на стороне S3:
      // загрузка файла большего размера будет отклонена хранилищем
      ContentLength: maxSize,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 })

    return NextResponse.json({ uploadUrl, fileKey })

  } catch (error) {
    console.error('Upload URL error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
