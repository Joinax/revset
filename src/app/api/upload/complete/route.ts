// src/app/api/upload/complete/route.ts
// Клиент вызывает этот endpoint ПОСЛЕ успешной загрузки файла в S3
// Сервер ставит задачу в pg-boss — worker проверит файл через ClamAV
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from '@/lib/queue'
import { z } from 'zod'

const DEST_MAP: Record<string, string> = {
  'temp/images': 'images',
  'temp/pdf':    'pdf',
  'temp/rfa':    'rfa',
}

const completeSchema = z.object({
  fileKey:    z.string().min(1).max(500),
  uploadType: z.enum(['image', 'pdf', 'rfa']),
  entityType: z.enum(['product', 'avatar']),
  entityId:   z.string().min(1).max(100),
  fieldName:  z.string().min(1).max(50),
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

    const parsed = completeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные параметры', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fileKey, uploadType, entityType, entityId, fieldName } = parsed.data

    // Убеждаемся что fileKey принадлежит этому пользователю
    // uploadType 'image' → папка 'images', остальные совпадают
    const folderName = uploadType === 'image' ? 'images' : uploadType
    const expectedPrefix = `temp/${folderName}/${session.user.id}/`
    if (!fileKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Недопустимый ключ файла' }, { status: 403 })
    }

    const tempFolder = `temp/${folderName}`
    const destFolder = DEST_MAP[tempFolder]
    if (!destFolder) {
      return NextResponse.json({ error: 'Неизвестный тип загрузки' }, { status: 400 })
    }

    const destKey = fileKey.replace(`${tempFolder}/`, `${destFolder}/`)

    // Для аватарки — сразу показываем пользователю, не ждём worker
    // Worker проверит ClamAV и обновит на постоянный ключ (или удалит при вирусе)
    if (entityType === 'avatar') {
      // Сохраняем постоянный ключ (без temp/) — worker уже переместил файл
      // destKey = 'images/userId/uuid/filename.jpg'
      await db.user.update({
        where: { id: entityId },
        data:  { image: destKey },
      })
    }

    const queue = await getQueue()
    const job: ScanFileJob = { fileKey, destKey, entityType, entityId, fieldName }

    await queue.send(QUEUE_SCAN_FILE, job, {
      retryLimit: 2,
      retryDelay: 60,
    })

    return NextResponse.json({ status: 'queued' })

  } catch (error) {
    console.error('[upload/complete] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
