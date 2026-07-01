// src/lib/queue.ts
import { PgBoss } from 'pg-boss'

// Promise-singleton: гарантирует одну инициализацию при любом числе
// конкурентных вызовов (worker + API-роуты стартуют параллельно).
let bossPromise: Promise<PgBoss> | null = null

async function initQueue(): Promise<PgBoss> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  })

  boss.on('error', (err) => {
    console.error('[pg-boss error]', err)
  })

  await boss.start()
  await boss.createQueue(QUEUE_SCAN_FILE)
  return boss
}

export function getQueue(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = initQueue().catch(err => {
      // Сбрасываем промис при ошибке — следующий вызов попробует снова
      bossPromise = null
      throw err
    })
  }
  return bossPromise
}

export const QUEUE_SCAN_FILE = 'scan-file'

export interface ScanFileJob {
  fileKey:    string  // temp/images/... или temp/rfa/... или temp/pdf/...
  destKey:    string  // images/... или rfa/... или pdf/...
  entityType: 'product' | 'avatar' | 'pack'
  entityId:   string  // productId или userId или packId
  fieldName:  string  // 'images' | 'rfaKey' | 'pdfKey' | 'image' | 'assemblyFileKey' | 'packImage'
  position?:  number  // used for PackImage ordering
}
