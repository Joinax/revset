import { ZipArchive } from 'archiver'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { s3, S3_BUCKET } from './s3'
import { db } from './db'
import { notifyAdmins } from './notify-admins'

export async function generatePackBundle(packId: string): Promise<void> {
  const pack = await db.pack.findUnique({
    where: { id: packId },
    include: {
      products: {
        include: { product: { select: { id: true, name: true, bimParams: true } } },
        orderBy: { position: 'asc' },
      },
    },
  })
  if (!pack) throw new Error(`Pack ${packId} not found`)

  try {
    const archive = new ZipArchive({ zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))

    const waitFinalize = new Promise<void>((resolve, reject) => {
      archive.on('finish', resolve)
      archive.on('error', reject)
    })

    for (const item of pack.products) {
      let fileKey: string | null = null
      try {
        const raw = item.product.bimParams
        const params = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown> ?? {})
        fileKey = (params.rfaKey ?? params.fileKey ?? null) as string | null
      } catch { /* skip */ }

      if (!fileKey) continue

      const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }))
      if (!obj.Body) continue
      const ext = fileKey.split('.').pop() ?? 'rfa'
      const safeName = item.product.name.replace(/[^a-zA-Z0-9а-яА-Я _-]/g, '_')
      // Prefix with position to prevent filename collisions
      archive.append(obj.Body as Readable, { name: `${item.position + 1}_${safeName}.${ext}` })
    }

    if (pack.assemblyFileKey) {
      const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: pack.assemblyFileKey }))
      if (obj.Body) {
        const ext = pack.assemblyFileKey.split('.').pop() ?? 'rvt'
        archive.append(obj.Body as Readable, { name: `assembly.${ext}` })
      }
    }

    if (pack.pdfKey) {
      const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: pack.pdfKey }))
      if (obj.Body) {
        archive.append(obj.Body as Readable, { name: 'instruction.pdf' })
      }
    }

    await archive.finalize()
    await waitFinalize

    const zipBuffer = Buffer.concat(chunks)
    const bundleKey = `packs/${packId}/bundle.zip`

    await s3.send(new PutObjectCommand({
      Bucket:      S3_BUCKET,
      Key:         bundleKey,
      Body:        zipBuffer,
      ContentType: 'application/zip',
    }))

    // Архив готов — публикуем пак и уведомляем автора
    await db.pack.update({
      where: { id: packId },
      data:  { bundleKey, moderationStatus: 'APPROVED' },
    })

    await db.notification.create({
      data: {
        userId:  pack.authorId,
        type:    'pack_approved',
        title:   'Пак опубликован',
        message: `Ваш пак «${pack.name}» прошёл модерацию и опубликован в каталоге.`,
        link:    `/pack/${packId}`,
      },
    }).catch(() => {})

  } catch (err) {
    // Генерация провалилась — уведомляем модераторов
    await db.pack.update({
      where: { id: packId },
      data:  { moderationStatus: 'BUNDLE_FAILED' },
    }).catch(() => {})

    await notifyAdmins({
      type:    'bundle_failed',
      title:   'Ошибка формирования архива',
      message: `Не удалось создать ZIP архив для пака «${pack.name}». Откройте пак и запустите повторную генерацию.`,
      link:    `/admin/packs/${packId}`,
    }).catch(() => {})

    throw err
  }
}
