import { ZipArchive } from 'archiver'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { s3, S3_BUCKET } from './s3'
import { db } from './db'
import { notifyAdmins } from './notify-admins'

export async function generateProductBundle(productId: string): Promise<void> {
  const product = await db.product.findUnique({
    where:  { id: productId },
    select: { id: true, name: true, bimParams: true, pdfKey: true, authorId: true },
  })
  if (!product) throw new Error(`Product ${productId} not found`)

  try {
    let rfaKey: string | null = null
    try {
      const raw = product.bimParams
      const params = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown> ?? {})
      rfaKey = (params.rfaKey ?? params.fileKey ?? null) as string | null
    } catch { /* skip */ }

    if (!rfaKey)          throw new Error(`Product ${productId} has no RFA key`)
    if (!product.pdfKey)  throw new Error(`Product ${productId} has no PDF key`)

    const archive = new ZipArchive({ zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))

    const waitFinalize = new Promise<void>((resolve, reject) => {
      archive.on('finish', resolve)
      archive.on('error', reject)
    })

    const rfaObj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: rfaKey }))
    if (rfaObj.Body) {
      const ext      = rfaKey.split('.').pop() ?? 'rfa'
      const safeName = product.name.replace(/[^a-zA-Z0-9а-яА-Я _-]/g, '_')
      archive.append(rfaObj.Body as Readable, { name: `${safeName}.${ext}` })
    }

    const pdfObj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: product.pdfKey }))
    if (pdfObj.Body) {
      archive.append(pdfObj.Body as Readable, { name: 'instruction.pdf' })
    }

    await archive.finalize()
    await waitFinalize

    const zipBuffer = Buffer.concat(chunks)
    const bundleKey = `products/${productId}/bundle.zip`

    await s3.send(new PutObjectCommand({
      Bucket:      S3_BUCKET,
      Key:         bundleKey,
      Body:        zipBuffer,
      ContentType: 'application/zip',
    }))

    // Архив готов — публикуем карточку и уведомляем автора
    await db.product.update({
      where: { id: productId },
      data:  { bundleKey, moderationStatus: 'APPROVED', isPublished: true },
    })

    await db.notification.create({
      data: {
        userId:  product.authorId,
        type:    'product_approved',
        title:   'Модель опубликована',
        message: `«${product.name}» прошла модерацию и опубликована в каталоге.`,
        link:    '/account?tab=author-products',
      },
    }).catch(() => {})

  } catch (err) {
    // Генерация провалилась — уведомляем модераторов
    await db.product.update({
      where: { id: productId },
      data:  { moderationStatus: 'BUNDLE_FAILED' },
    }).catch(() => {})

    await notifyAdmins({
      type:    'bundle_failed',
      title:   'Ошибка формирования архива',
      message: `Не удалось создать ZIP архив для карточки «${product.name}». Откройте карточку и запустите повторную генерацию.`,
      link:    `/admin/families/${productId}`,
    }).catch(() => {})

    throw err
  }
}
