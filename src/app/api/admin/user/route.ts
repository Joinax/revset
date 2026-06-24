// src/app/api/admin/user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!adminUser || adminUser.role !== 'admin' || adminUser.isBanned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userActionSchema = z.object({
    userId:   z.string().min(1).max(50),
    role:     z.enum(['user', 'author', 'admin']).optional(),
    isBanned: z.boolean().optional(),
  })

  let userId: string, role: string | undefined, isBanned: boolean | undefined
  try {
    const result = userActionSchema.safeParse(await request.json())
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    ;({ userId, role, isBanned } = result.data)
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  // Нельзя изменить собственную роль или заблокировать самого себя —
  // иначе администратор может случайно лишить себя доступа к системе
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Нельзя изменить собственный аккаунт' }, { status: 400 })
  }

  const before = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isBanned: true },
  })
  if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (role !== undefined) data.role = role
  if (isBanned !== undefined) data.isBanned = isBanned

  await db.user.update({ where: { id: userId }, data })

  // При бане — отзываем все активные сессии, иначе забаненный пользователь
  // продолжит работу до естественного истечения сессии.
  // При смене роли — тоже отзываем: роль в сессии может быть закэширована,
  // и пользователь продолжит действовать со старой ролью (например, автор
  // после отзыва статуса продолжит видеть авторские вкладки и вызывать API).
  const roleChanged = data.role !== undefined && data.role !== before.role
  const bannedNow = data.isBanned === true

  if (bannedNow || roleChanged) {
    await db.session.deleteMany({ where: { userId } })
  }

  if (roleChanged) {
    await logAdminAction({
      adminId: session.user.id,
      action: 'user.role_change',
      targetType: 'User',
      targetId: userId,
      details: { from: before.role, to: data.role },
    })
  }

  if (data.isBanned !== undefined && data.isBanned !== before.isBanned) {
    await logAdminAction({
      adminId: session.user.id,
      action: data.isBanned ? 'user.ban' : 'user.unban',
      targetType: 'User',
      targetId: userId,
    })
  }

  return NextResponse.json({ ok: true })
}
