// src/app/api/cron/update-new/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function checkSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  // Если переменная не задана — блокируем все запросы,
  // иначе любой запрос с заголовком 'undefined' пройдёт проверку
  if (!cronSecret) return false
  return req.headers.get('x-cron-secret') === cronSecret
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
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

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const count = await db.product.count({
    where: { isNew: true, createdAt: { lt: fourteenDaysAgo } },
  })

  return NextResponse.json({ pendingUpdate: count })
}
