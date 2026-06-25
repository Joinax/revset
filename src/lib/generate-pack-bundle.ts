import { ZipArchive } from 'archiver'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { s3, S3_BUCKET } from './s3'
import { db } from './db'

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
      const params = JSON.parse((item.product.bimParams as string | null) ?? '{}')
      fileKey = params.rfaKey ?? params.fileKey ?? null
    } catch { /* skip */ }

    if (!fileKey) continue

    const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }))
    if (!obj.Body) continue
    const ext = fileKey.split('.').pop() ?? 'rfa'
    const safeName = item.product.name.replace(/[^a-zA-Z0-9а-яА-Я _-]/g, '_')
    archive.append(obj.Body as Readable, { name: `${safeName}.${ext}` })
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

  await db.pack.update({ where: { id: packId }, data: { bundleKey } })
}
