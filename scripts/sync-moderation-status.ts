// scripts/sync-moderation-status.ts
// Запуск: npx tsx scripts/sync-moderation-status.ts
//
// Назначение: после добавления поля moderationStatus в Product все
// существующие записи получают значение DRAFT по умолчанию (из схемы).
// Этот скрипт приводит их в соответствие с уже имеющимся isPublished:
//   isPublished = true  → moderationStatus = APPROVED
//   isPublished = false → moderationStatus = DRAFT (оставляем как есть)
//
// Prisma-клиент создаётся здесь локально (а не через src/lib/db.ts),
// чтобы гарантировать что DATABASE_URL уже загружен из .env к моменту
// инициализации pg.Pool — при импорте общего db.ts порядок ESM-импортов
// поднимал инициализацию пула выше вызова dotenv.config().

import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool    = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db      = new PrismaClient({ adapter })

async function main() {
  const result = await db.product.updateMany({
    where: { isPublished: true },
    data:  { moderationStatus: 'APPROVED' },
  })

  console.log(`Обновлено товаров: ${result.count} (isPublished=true → moderationStatus=APPROVED)`)

  const stillDraft = await db.product.count({
    where: { isPublished: false, moderationStatus: 'DRAFT' },
  })
  console.log(`Осталось в DRAFT (isPublished=false): ${stillDraft}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => {
    await db.$disconnect()
    await pool.end()
  })
