// src/lib/worker.ts
// pg-boss worker: берёт задачи из очереди, проверяет через ClamAV, перемещает в S3
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET } from './s3'
import { db } from './db'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from './queue'
import { scanFile } from './scanner'

export async function startWorker() {
  const queue = await getQueue()

  console.log('[worker] started, waiting for scan-file jobs...')

  await queue.work<ScanFileJob>(
    QUEUE_SCAN_FILE,
    { batchSize: 1 },
    async (jobs) => {
      const job = jobs[0]
      if (!job) return

      const { fileKey, destKey, entityType, entityId, fieldName } = job.data

      console.log(`[worker] scanning: ${fileKey}`)

      try {
        // 1. Проверяем что файл существует в S3
        try {
          await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }))
        } catch {
          console.error(`[worker] file not found in S3: ${fileKey}`)
          await markRejected(entityType, entityId, 'Файл не найден в хранилище')
          return
        }

        // 2. Сканируем через ClamAV (заглушка — всегда возвращает clean: true)
        const result = await scanFile(fileKey)

        if (!result.clean) {
          console.warn(`[worker] threat detected in ${fileKey}: ${result.threat}`)
          await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }))
          await markRejected(entityType, entityId, `Обнаружена угроза: ${result.threat}`)
          return
        }

        // 3. Файл чистый — копируем из temp/ в постоянную папку
        await s3.send(new CopyObjectCommand({
          Bucket:     S3_BUCKET,
          CopySource: `${S3_BUCKET}/${fileKey}`,
          Key:        destKey,
        }))

        // 4. Удаляем из temp/
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }))

        // 5. Обновляем запись в БД
        await markPending(entityType, entityId, fieldName, destKey)

        console.log(`[worker] done: ${fileKey} → ${destKey}`)

      } catch (err) {
        console.error(`[worker] error processing ${fileKey}:`, err)
        throw err // pg-boss сделает retry
      }
    }
  )
}

async function markPending(
  entityType: string,
  entityId: string,
  fieldName: string,
  destKey: string
) {
  if (entityType === 'product') {
    const product = await db.product.findUnique({
      where:  { id: entityId },
      select: { authorId: true, name: true },
    })
    if (!product) return

    if (fieldName === 'images') {
      await db.product.update({
        where: { id: entityId },
        data: {
          images:           { push: destKey },
          moderationStatus: 'PENDING',
        },
      })
    } else {
      // rfaKey, pdfKey — обновляем поле напрямую через bimParams
      const current = await db.product.findUnique({
        where:  { id: entityId },
        select: { bimParams: true },
      })
      let params: Record<string, unknown> = {}
      try { params = JSON.parse(current?.bimParams ?? '{}') } catch { /* */ }
      // fieldName = 'rfaKey' | 'pdfKey' — сохраняем постоянный ключ файла
      params[fieldName] = destKey

      await db.product.update({
        where: { id: entityId },
        data: {
          bimParams:        JSON.stringify(params),
          moderationStatus: 'PENDING',
        },
      })
    }



  } else if (entityType === 'avatar') {
    await db.user.update({
      where: { id: entityId },
      data:  { image: destKey },
    })
  }
}

async function markRejected(
  entityType: string,
  entityId: string,
  reason: string
) {
  if (entityType === 'product') {
    const product = await db.product.findUnique({
      where:  { id: entityId },
      select: { authorId: true, name: true },
    })
    if (!product) return

    await db.product.update({
      where: { id: entityId },
      data: {
        moderationStatus:  'REJECTED',
        moderationComment: reason,
      },
    })

    await db.notification.create({
      data: {
        userId:  product.authorId,
        type:    'file_scan_rejected',
        title:   'Файл отклонён',
        message: `Файл для «${product.name}» был отклонён: ${reason}`,
        link:    '/account?tab=author-products',
      },
    })

  } else if (entityType === 'avatar') {
    // Обнуляем аватарку — она была в temp/ и теперь удалена
    await db.user.update({
      where: { id: entityId },
      data:  { image: null },
    })

    // Уведомляем пользователя
    await db.notification.create({
      data: {
        userId:  entityId,
        type:    'avatar_scan_rejected',
        title:   'Аватарка удалена',
        message: 'Ваша аватарка была удалена: обнаружена угроза безопасности.',
        link:    '/account?tab=profile',
      },
    })

    // Запись в audit log для админа
    await db.adminAuditLog.create({
      data: {
        adminId:    entityId,  // фиктивный — используем userId как инициатора
        action:     'avatar.virus_detected',
        targetType: 'User',
        targetId:   entityId,
        details:    { reason },
      },
    }).catch(() => {/* audit log не критичен */})

    console.warn(`[worker] avatar virus detected for user ${entityId}: ${reason}`)
  }
}
