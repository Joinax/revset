// src/app/api/admin/user/route.ts
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

  const { userId, role, isBanned } = await request.json()
  if (!userId) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

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

  const data: any = {}
  if (role !== undefined && ['user', 'author', 'admin'].includes(role)) data.role = role
  if (isBanned !== undefined) data.isBanned = Boolean(isBanned)

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
