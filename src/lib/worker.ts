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

        // 2. Сканируем через ClamAV
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

        // 5. Обновляем запись в БД и уменьшаем счётчик
        await markPending(entityType, entityId, fieldName, destKey, job.data.position)

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
  destKey: string,
  position?: number
) {
  if (entityType === 'product') {
    let updated: { pendingScanCount: number; moderationStatus: string }

    if (fieldName === 'images') {
      updated = await db.product.update({
        where: { id: entityId },
        data: {
          images:          { push: destKey },
          pendingScanCount: { decrement: 1 },
        },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    } else if (fieldName === 'pdfKey') {
      updated = await db.product.update({
        where: { id: entityId },
        data: {
          pdfKey:           destKey,
          pendingScanCount: { decrement: 1 },
        },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    } else {
      // rfaKey — сохраняем в bimParams
      const current = await db.product.findUnique({
        where:  { id: entityId },
        select: { bimParams: true },
      })
      let params: Record<string, unknown> = {}
      try {
        const raw = current?.bimParams
        params = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown> ?? {})
      } catch { /* */ }
      params[fieldName] = destKey

      updated = await db.product.update({
        where: { id: entityId },
        data: {
          bimParams:        JSON.stringify(params),
          pendingScanCount: { decrement: 1 },
        },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    }

    // Переходим в PENDING только когда все файлы проверены
    // и только если статус ещё PENDING_SCAN (не трогаем APPROVED/REJECTED)
    if (updated.pendingScanCount <= 0 && updated.moderationStatus === 'PENDING_SCAN') {
      await db.product.update({
        where: { id: entityId },
        data:  { moderationStatus: 'PENDING' },
      })
    }

  } else if (entityType === 'avatar') {
    await db.user.update({
      where: { id: entityId },
      data:  { image: destKey },
    })

  } else if (entityType === 'pack') {
    let updated: { pendingScanCount: number; moderationStatus: string }

    if (fieldName === 'packImage') {
      await db.packImage.create({
        data: { packId: entityId, key: destKey, position: position ?? 0 },
      })
      updated = await db.pack.update({
        where: { id: entityId },
        data:  { pendingScanCount: { decrement: 1 } },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    } else if (fieldName === 'packExclusiveImage') {
      await db.packExclusiveImage.create({
        data: { packId: entityId, key: destKey, position: position ?? 0 },
      })
      updated = await db.pack.update({
        where: { id: entityId },
        data:  { pendingScanCount: { decrement: 1 } },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    } else {
      const ALLOWED_PACK_FIELDS = ['assemblyFileKey', 'pdfKey']
      if (!ALLOWED_PACK_FIELDS.includes(fieldName)) {
        console.error(`markPending: invalid fieldName "${fieldName}" for pack entity`)
        return
      }
      updated = await db.pack.update({
        where: { id: entityId },
        data:  { [fieldName]: destKey, pendingScanCount: { decrement: 1 } },
        select: { pendingScanCount: true, moderationStatus: true },
      })
    }

    // Переходим в PENDING только когда все файлы проверены
    // и только если статус ещё PENDING_SCAN (не трогаем APPROVED/REJECTED)
    if (updated.pendingScanCount <= 0 && updated.moderationStatus === 'PENDING_SCAN') {
      await db.pack.update({
        where: { id: entityId },
        data:  { moderationStatus: 'PENDING' },
      })
    }
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
      select: { authorId: true, name: true, moderationStatus: true },
    })
    if (!product) return

    // Не трогаем статус если карточка уже прошла модерацию или опубликована
    if (product.moderationStatus !== 'PENDING_SCAN') {
      console.warn(`[worker] markRejected skipped — product ${entityId} is already in status ${product.moderationStatus}`)
      return
    }

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
    await db.user.update({
      where: { id: entityId },
      data:  { image: null },
    })

    await db.notification.create({
      data: {
        userId:  entityId,
        type:    'avatar_scan_rejected',
        title:   'Аватарка удалена',
        message: 'Ваша аватарка была удалена: обнаружена угроза безопасности.',
        link:    '/account?tab=profile',
      },
    })

    await db.adminAuditLog.create({
      data: {
        adminId:    entityId,
        action:     'avatar.virus_detected',
        targetType: 'User',
        targetId:   entityId,
        details:    { reason },
      },
    }).catch(() => {})

    console.warn(`[worker] avatar virus detected for user ${entityId}: ${reason}`)

  } else if (entityType === 'pack') {
    const pack = await db.pack.findUnique({
      where:  { id: entityId },
      select: { authorId: true, name: true, moderationStatus: true },
    })
    if (!pack) return

    // Не трогаем статус если пак уже прошёл модерацию или опубликован
    if (pack.moderationStatus !== 'PENDING_SCAN') {
      console.warn(`[worker] markRejected skipped — pack ${entityId} is already in status ${pack.moderationStatus}`)
      return
    }

    await db.pack.update({
      where: { id: entityId },
      data: {
        moderationStatus:  'REJECTED',
        moderationComment: reason,
      },
    })

    await db.notification.create({
      data: {
        userId:  pack.authorId,
        type:    'pack_scan_rejected',
        title:   'Файл пака отклонён',
        message: `Файл для пака «${pack.name}» был отклонён: ${reason}`,
        link:    '/account?tab=author-packs',
      },
    })
  }
}
