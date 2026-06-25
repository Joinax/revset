import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit-log'
import { generatePackBundle } from '@/lib/generate-pack-bundle'

const schema = z.object({
  packId:            z.string().min(1).max(50),
  action:            z.enum(['approve', 'reject']),
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

  const moderationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await db.pack.update({
    where: { id: packId },
    data: {
      moderationStatus,
      moderationComment: moderationStatus === 'REJECTED' ? (moderationComment?.trim() || null) : null,
    },
  })

  if (moderationStatus === 'APPROVED') {
    // Generate ZIP in background — don't block the response
    generatePackBundle(packId).catch(err =>
      console.error(`[admin/packs] ZIP generation failed for ${packId}:`, err)
    )

    await db.notification.create({
      data: {
        userId:  pack.authorId,
        type:    'pack_approved',
        title:   'Пак одобрен',
        message: `Ваш пак «${pack.name}» прошёл модерацию и опубликован.`,
        link:    `/pack/${packId}`,
      },
    }).catch(() => {})
  } else {
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
  }

  await logAdminAction({
    adminId:    session.user.id,
    action:     action === 'approve' ? 'pack.approve' : 'pack.reject',
    targetType: 'Pack',
    targetId:   packId,
    details:    { moderationStatus },
  })

  return NextResponse.json({ ok: true })
}
