// src/lib/queue.ts
import { PgBoss } from 'pg-boss'

let boss: PgBoss | null = null

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  boss = new PgBoss(process.env.DATABASE_URL)

  boss.on('error', (err) => {
    console.error('[pg-boss error]', err)
  })

  await boss.start()
  await boss.createQueue(QUEUE_SCAN_FILE)
  return boss
}

export const QUEUE_SCAN_FILE = 'scan-file'

export interface ScanFileJob {
  fileKey:    string  // temp/images/... или temp/rfa/... или temp/pdf/...
  destKey:    string  // images/... или rfa/... или pdf/...
  entityType: 'product' | 'avatar' | 'pack'
  entityId:   string  // productId или userId или packId
  fieldName:  string  // 'images' | 'rfaKey' | 'pdfKey' | 'image' | 'assemblyFileKey' | 'packImage' | 'packExclusiveImage'
  position?:  number  // used for PackImage/PackExclusiveImage ordering
}
