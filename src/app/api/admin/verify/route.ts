// src/app/api/admin/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Роль и бан проверяем из БД — сессия может содержать устаревшую роль
  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, action, autoPublish } = await request.json()

  // Переключение авто-публикации
  if (action === 'toggleAutoPublish') {
    if (!userId) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

    await db.authorProfile.update({
      where: { userId },
      data:  { autoPublish },
    })

    await logAdminAction({
      adminId: session.user.id,
      action: 'verification.toggle_auto_publish',
      targetType: 'User',
      targetId: userId,
      details: { autoPublish },
    })

    return NextResponse.json({ ok: true })
  }

  if (!userId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const targetUser = await db.user.findUnique({
    where:   { id: userId },
    select:  { role: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  if (action === 'approve') {
    // Подтверждаем заявку — именно здесь пользователь реально становится автором
    await db.user.update({ where: { id: userId }, data: { role: 'author' } })
    await db.authorProfile.update({ where: { userId }, data: { isVerified: true } })

    await db.notification.create({
      data: {
        userId,
        type:    'author_application_approved',
        title:   'Заявка на статус автора одобрена',
        message: 'Поздравляем! Вы можете загружать модели и продавать их на платформе.',
        link:    '/account?tab=author-upload',
      },
    })
  } else {
    const wasActiveAuthor = targetUser.role === 'author'

    // И отклонение новой заявки, и "Снять верификацию" у действующего автора —
    // полный откат до покупателя: роль обратно 'user', профиль автора удаляется.
    // Можно подать заявку снова в будущем.
    await db.user.update({ where: { id: userId }, data: { role: 'user' } })

    // Все его семейства снимаются с публикации (не удаляются) — раз автора
    // больше нет, его товары не должны оставаться видимыми в каталоге
    await db.product.updateMany({
      where: { authorId: userId },
      data:  { isPublished: false, moderationStatus: 'DRAFT', moderationComment: null },
    })

    await db.authorProfile.delete({ where: { userId } })

    await db.notification.create({
      data: {
        userId,
        type:    'author_application_rejected',
        title:   wasActiveAuthor ? 'Статус автора отозван' : 'Заявка на статус автора отклонена',
        message: wasActiveAuthor
          ? 'Администратор отозвал ваш статус автора. Загруженные модели сняты с публикации.'
          : 'К сожалению, заявка на статус автора отклонена. Вы можете подать заявку повторно.',
        link:    '/account',
      },
    })

    revalidatePath('/catalog')
    revalidatePath('/')
  }

  await logAdminAction({
    adminId: session.user.id,
    action: action === 'approve' ? 'verification.approve' : 'verification.reject',
    targetType: 'User',
    targetId: userId,
  })

  return NextResponse.json({ ok: true })
}
