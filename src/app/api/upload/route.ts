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

const FILE_RULES = {
  image: {
    mimeTypes:  ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes:   10 * 1024 * 1024,   // 10 МБ
    tempFolder: 'temp/images',
    label:      'Изображение',
  },
  pdf: {
    mimeTypes:  ['application/pdf'],
    maxBytes:   20 * 1024 * 1024,   // 20 МБ
    tempFolder: 'temp/pdf',
    label:      'PDF',
  },
  rfa: {
    mimeTypes:  [] as string[],  // MIME для .rfa/rvt ненадёжен — только расширение
    maxBytes:   200 * 1024 * 1024,  // 200 МБ
    tempFolder: 'temp/rfa',
    label:      'RFA/RVT файл',
  },
} as const

const uploadSchema = z.object({
  fileName:   z.string().min(1).max(255),
  fileType:   z.string().min(1).max(100),
  fileSize:   z.number().positive().finite(),
  uploadType: z.enum(['image', 'pdf', 'rfa']),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true },
    })

    if (!user || user.isBanned) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const parsed = uploadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные параметры', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fileName, fileType, fileSize, uploadType } = parsed.data

    // PDF и RFA — только авторы и админы
    if (uploadType !== 'image' && user.role !== 'author' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ только для авторов' }, { status: 403 })
    }

    const rules = FILE_RULES[uploadType]

    if (fileSize > rules.maxBytes) {
      return NextResponse.json(
        { error: `${rules.label} не должен превышать ${rules.maxBytes / 1024 / 1024} МБ` },
        { status: 400 }
      )
    }

    if (uploadType === 'rfa') {
      const ext = fileName.toLowerCase().split('.').pop()
      if (ext !== 'rfa' && ext !== 'rvt') {
        return NextResponse.json({ error: 'Разрешены только файлы .rfa и .rvt' }, { status: 400 })
      }
    } else {
      const allowedMimes = rules.mimeTypes as string[]
      if (!allowedMimes.includes(fileType)) {
        return NextResponse.json(
          { error: `Недопустимый тип файла. Разрешены: ${allowedMimes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Ключ в temp/ — изолируем по userId чтобы нельзя было угадать чужой файл
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileKey = `${rules.tempFolder}/${session.user.id}/${randomUUID()}/${safeFileName}`

    const command = new PutObjectCommand({
      Bucket:        S3_BUCKET,
      Key:           fileKey,
      ContentType:   fileType,
      ContentLength: fileSize,
    })

    // URL действителен 15 минут — достаточно для загрузки 200 МБ
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 })

    return NextResponse.json({ uploadUrl, fileKey })

  } catch (error) {
    console.error('[upload] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
