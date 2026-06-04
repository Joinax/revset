// src/app/api/upload/route.ts
// Генерирует presigned URL для загрузки файла прямо из браузера в S3
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { s3, S3_BUCKET } from '@/lib/s3'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // Только авторизованные пользователи с ролью author
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { fileName, fileType, fileSize } = await req.json()

    // Валидация
    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName и fileType обязательны' }, { status: 400 })
    }

    // Только RFA файлы
    if (!fileName.toLowerCase().endsWith('.rfa')) {
      return NextResponse.json({ error: 'Разрешены только файлы формата .rfa' }, { status: 400 })
    }

    // Максимум 50 МБ
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл не должен превышать 50 МБ' }, { status: 400 })
    }

    // Уникальный ключ файла: userId/uuid/filename.rfa
    const fileKey = `rfa/${session.user.id}/${randomUUID()}/${fileName}`

    // Генерируем presigned URL — действует 10 минут
    const command = new PutObjectCommand({
      Bucket:        S3_BUCKET,
      Key:           fileKey,
      ContentType:   fileType,
      ContentLength: fileSize,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 })

    return NextResponse.json({ uploadUrl, fileKey })

  } catch (error) {
    console.error('Upload URL error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
