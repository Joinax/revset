import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit-log'
import { generatePackBundle } from '@/lib/generate-pack-bundle'
import { emitAdminEvent } from '@/lib/admin-events'

const schema = z.object({
  packId:            z.string().min(1).max(50),
  action:            z.enum(['approve', 'reject', 'retry_bundle']),
  moderationComment: z.string().max(500).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { packId, action, moderationComment } = parsed.data

  const pack = await db.pack.findUnique({
    where:  { id: packId },
    select: { id: true, moderationStatus: true, authorId: true, name: true },
  })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  // Повторная генерация архива при ошибке
  if (action === 'retry_bundle') {
    if (!['BUNDLE_FAILED', 'BUILDING_BUNDLE'].includes(pack.moderationStatus)) {
      return NextResponse.json({ error: 'Повторная генерация возможна только при статусе BUNDLE_FAILED или BUILDING_BUNDLE' }, { status: 400 })
    }

    await db.pack.update({
      where: { id: packId },
      data:  { moderationStatus: 'BUILDING_BUNDLE' },
    })

    generatePackBundle(packId).catch(err =>
      console.error(`[admin/packs] retry bundle failed for ${packId}:`, err)
    )

    await logAdminAction({
      adminId:    session.user.id,
      action:     'pack.retry_bundle',
      targetType: 'Pack',
      targetId:   packId,
      details:    {},
    })

    return NextResponse.json({ ok: true })
  }

  // Одобрение — пак должен быть в статусе PENDING
  if (action === 'approve') {
    if (pack.moderationStatus !== 'PENDING') {
      return NextResponse.json({ error: 'Пак не ожидает проверки' }, { status: 400 })
    }

    await db.pack.update({
      where: { id: packId },
      data:  { moderationStatus: 'BUILDING_BUNDLE', moderationComment: null },
    })

    emitAdminEvent({ type: 'pack', id: packId })
    // ZIP собирается в фоне; уведомление автору отправится внутри generatePackBundle
    generatePackBundle(packId).catch(err =>
      console.error(`[admin/packs] bundle generation failed for ${packId}:`, err)
    )

    await logAdminAction({
      adminId:    session.user.id,
      action:     'pack.approve',
      targetType: 'Pack',
      targetId:   packId,
      details:    { moderationStatus: 'BUILDING_BUNDLE' },
    })

    return NextResponse.json({ ok: true })
  }

  // Отклонение — пак должен быть в статусе PENDING
  if (action === 'reject') {
    if (pack.moderationStatus !== 'PENDING') {
      return NextResponse.json({ error: 'Пак не ожидает проверки' }, { status: 400 })
    }

    await db.pack.update({
      where: { id: packId },
      data: {
        moderationStatus:  'REJECTED',
        moderationComment: moderationComment?.trim() || null,
      },
    })

    emitAdminEvent({ type: 'pack', id: packId })

    await db.notification.create({
      data: {
        userId:  pack.authorId,
        type:    'pack_rejected',
        title:   'Пак отклонён',
        message: moderationComment?.trim()
          ? `Ваш пак «${pack.name}» отклонён: ${moderationComment.trim()}`
          : `Ваш пак «${pack.name}» отклонён модератором.`,
        link:    '/account?tab=author-packs',
      },
    }).catch(() => {})

    await logAdminAction({
      adminId:    session.user.id,
      action:     'pack.reject',
      targetType: 'Pack',
      targetId:   packId,
      details:    { moderationStatus: 'REJECTED' },
    })

    return NextResponse.json({ ok: true })
  }
}
