import { ZipArchive } from 'archiver'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { s3, S3_BUCKET } from './s3'
import { db } from './db'
import { notifyAdmins } from './notify-admins'
import { emitAdminEvent } from './admin-events'

const BUNDLE_TIMEOUT_MS = 3 * 60 * 1000 // 3 минуты максимум

async function fetchS3Buffer(key: string): Promise<Buffer | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    if (!obj.Body) return null
    const bytes = await obj.Body.transformToByteArray()
    return Buffer.from(bytes)
  } catch {
    return null
  }
}

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

  const bundleKey = `packs/${packId}/bundle.zip`

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Bundle generation timed out after 10 minutes')), BUNDLE_TIMEOUT_MS)
  )

  try {
    await Promise.race([_buildBundle(pack, bundleKey), timeoutPromise])

    await db.pack.update({
      where: { id: packId },
      data:  { bundleKey, moderationStatus: 'APPROVED', wasPublished: true },
    })

    emitAdminEvent({ type: 'pack', id: packId })

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
    await db.pack.update({
      where: { id: packId },
      data:  { moderationStatus: 'BUNDLE_FAILED' },
    }).catch(() => {})
    emitAdminEvent({ type: 'pack', id: packId })

    await notifyAdmins({
      type:    'bundle_failed',
      title:   'Ошибка формирования архива',
      message: `Не удалось создать ZIP архив для пака «${pack.name}». Откройте пак и запустите повторную генерацию.`,
      link:    `/admin/packs/${packId}`,
    }).catch(() => {})

    throw err
  }
}

async function _buildBundle(
  pack: {
    products: { position: number; product: { id: string; name: string; bimParams: unknown } }[]
    assemblyFileKey: string | null
    pdfKey: string | null
  },
  bundleKey: string
): Promise<void> {
  const archive = new ZipArchive({ zlib: { level: 6 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  const upload = new Upload({
    client: s3,
    params: {
      Bucket:      S3_BUCKET,
      Key:         bundleKey,
      Body:        passThrough,
      ContentType: 'application/zip',
    },
    queueSize:         4,
    partSize:          10 * 1024 * 1024,
    leavePartsOnError: false,
  })

  // Скачиваем все файлы в буферы ДО начала архивирования —
  // AWS SDK v3 SdkStream плохо работает с archiver в потоковом режиме
  for (const item of pack.products) {
    let fileKey: string | null = null
    try {
      const raw    = item.product.bimParams
      const params = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown> ?? {})
      fileKey = (params.rfaKey ?? params.fileKey ?? null) as string | null
    } catch { /* skip */ }

    if (!fileKey) continue

    const buf = await fetchS3Buffer(fileKey)
    if (!buf) continue

    const ext      = fileKey.split('.').pop() ?? 'rfa'
    const safeName = item.product.name.replace(/[^a-zA-Z0-9а-яА-Я _-]/g, '_')
    archive.append(buf, { name: `${item.position + 1}_${safeName}.${ext}` })
  }

  if (pack.assemblyFileKey) {
    const buf = await fetchS3Buffer(pack.assemblyFileKey)
    if (buf) {
      const ext = pack.assemblyFileKey.split('.').pop() ?? 'rvt'
      archive.append(buf, { name: `assembly.${ext}` })
    }
  }

  if (pack.pdfKey) {
    const buf = await fetchS3Buffer(pack.pdfKey)
    if (buf) {
      archive.append(buf, { name: 'instruction.pdf' })
    }
  }

  const archiveError = new Promise<never>((_, reject) => {
    archive.on('error', reject)
  })

  await Promise.race([
    Promise.all([archive.finalize(), upload.done()]),
    archiveError,
  ])
}
