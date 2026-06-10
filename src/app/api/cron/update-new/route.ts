// src/app/api/cron/update-new/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Проверяем секретный ключ
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const result = await db.product.updateMany({
    where: {
      isNew:     true,
      createdAt: { lt: fourteenDaysAgo },
    },
    data: { isNew: false },
  })

  console.log(`[CRON] update-new: ${result.count} товаров обновлено`)

  return NextResponse.json({
    ok:      true,
    updated: result.count,
    cutoff:  fourteenDaysAgo.toISOString(),
  })
}

// GET для ручной проверки (без секрета не работает)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const count = await db.product.count({
    where: { isNew: true, createdAt: { lt: fourteenDaysAgo } },
  })

  return NextResponse.json({ pendingUpdate: count })
}
