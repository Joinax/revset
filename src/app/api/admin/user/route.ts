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

  // Читаем текущие значения — нужны для лога (старое → новое) и чтобы
  // не писать в лог изменения, которых на самом деле не было
  const before = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isBanned: true },
  })
  if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const data: any = {}
  if (role !== undefined && ['user', 'author', 'admin'].includes(role)) data.role = role
  if (isBanned !== undefined) data.isBanned = isBanned

  await db.user.update({ where: { id: userId }, data })

  // При бане отзываем все активные сессии — иначе пользователь, уже залогиненный
  // в браузере, продолжит пользоваться сайтом до естественного истечения сессии
  if (data.isBanned === true) {
    await db.session.deleteMany({ where: { userId } })
  }

  // Логируем смену роли
  if (data.role !== undefined && data.role !== before.role) {
    await logAdminAction({
      adminId: session.user.id,
      action: 'user.role_change',
      targetType: 'User',
      targetId: userId,
      details: { from: before.role, to: data.role },
    })
  }

  // Логируем бан/разбан
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
