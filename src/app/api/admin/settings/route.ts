// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const keys = Object.keys(body)

  // Читаем текущие значения — нужны для лога (что изменилось)
  const before = await db.setting.findMany({
    where: { key: { in: keys } },
  })
  const beforeMap = Object.fromEntries(before.map(s => [s.key, s.value]))

  // Сохраняем каждый ключ
  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      db.setting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  )

  // Логируем только реально изменившиеся ключи
  const changed: Record<string, { from: string | null; to: string }> = {}
  for (const [key, value] of Object.entries(body)) {
    const newValue = String(value)
    const oldValue = beforeMap[key] ?? null
    if (oldValue !== newValue) {
      changed[key] = { from: oldValue, to: newValue }
    }
  }

  if (Object.keys(changed).length > 0) {
    await logAdminAction({
      adminId: session.user.id,
      action: 'settings.update',
      targetType: 'Setting',
      details: changed,
    })
  }

  return NextResponse.json({ ok: true })
}
