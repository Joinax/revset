// src/app/api/support/[id]/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { getQueue, QUEUE_SCAN_FILE, type ScanFileJob } from '@/lib/queue'

const messageSchema = z.object({
  text:       z.string().max(5000).optional(),
  fileKeys:   z.array(z.string()).max(5).optional(),
  isInternal: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true, isSupport: true, isModerator: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isStaff = can(currentUser, 'support')

    const ticket = await db.supportTicket.findUnique({
      where:  { id: ticketId },
      select: { id: true, number: true, userId: true, status: true, assignedTo: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    // Access check: owner or support staff
    if (ticket.userId !== session.user.id && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }
    const { text, fileKeys, isInternal: rawIsInternal } = parsed.data

    // Validate message has content
    const hasText     = !!(text && text.trim().length > 0)
    const hasFiles    = !!(fileKeys && fileKeys.length > 0)
    if (!hasText && !hasFiles) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    // isInternal only for staff
    const isInternal = isStaff ? (rawIsInternal ?? false) : false

    const attachmentsEnabled = process.env.TICKET_ATTACHMENTS_ENABLED === 'true'

    // Validate fileKeys
    if (hasFiles) {
      if (!attachmentsEnabled) {
        return NextResponse.json({ error: 'Вложения недоступны' }, { status: 400 })
      }
      const userPrefix = `temp/images/${session.user.id}/`
      for (const key of fileKeys!) {
        if (!key.startsWith(userPrefix)) {
          return NextResponse.json({ error: 'Некорректный ключ файла' }, { status: 400 })
        }
      }
    }

    // Create message + attachments + status update in one transaction
    const { msgId, attachmentJobs } = await db.$transaction(async (tx) => {
      // Create the message
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId,
          authorId:   session.user.id,
          isStaff,
          isInternal,
          text:       hasText ? text!.trim() : null,
        },
        select: { id: true },
      })

      // Create attachments and collect scan jobs
      const jobs: Array<{ fileKey: string; destKey: string; entityId: string }> = []

      if (hasFiles && attachmentsEnabled) {
        for (const fileKey of fileKeys!) {
          const att = await tx.ticketAttachment.create({
            data: {
              messageId: msg.id,
              fileKey,          // kept as temp key until scan worker moves it
              status:    'SCANNING',
            },
            select: { id: true },
          })
          const safeName = fileKey.split('/').pop() ?? 'file'
          const destKey  = `support/${ticketId}/${att.id}/${safeName}`
          jobs.push({ fileKey, destKey, entityId: att.id })
        }
      }

      // Status transitions (only for non-internal messages)
      if (!isInternal) {
        const isOwner  = ticket.userId === session.user.id
        const newStatus = isOwner ? 'AWAITING_SUPPORT' : 'AWAITING_USER'
        await tx.supportTicket.update({
          where: { id: ticketId },
          data:  { status: newStatus, updatedAt: new Date() },
        })
      }

      return { msgId: msg.id, attachmentJobs: jobs }
    })

    // Enqueue ClamAV scan jobs
    if (attachmentJobs.length > 0) {
      const queue = await getQueue()
      for (const job of attachmentJobs) {
        const scanJob: ScanFileJob = {
          fileKey:    job.fileKey,
          destKey:    job.destKey,
          entityType: 'ticket_attachment',
          entityId:   job.entityId,
          fieldName:  'fileKey',
        }
        await queue.send(QUEUE_SCAN_FILE, scanJob, { retryLimit: 2, retryDelay: 60 })
      }
    }

    // Notifications (fire-and-forget; don't let failures abort the response)
    const isOwner = ticket.userId === session.user.id
    if (!isInternal) {
      try {
        if (isStaff) {
          // Staff replied — notify ticket owner
          await db.notification.create({
            data: {
              userId:  ticket.userId,
              type:    'ticket_reply',
              title:   'Ответ от поддержки',
              message: `Поддержка ответила на обращение #${ticket.number}`,
              link:    `/account?tab=support&ticket=${ticketId}`,
            },
          })
        } else if (isOwner) {
          // Owner replied — notify assigned agent or all support staff
          if (ticket.assignedTo) {
            await db.notification.create({
              data: {
                userId:  ticket.assignedTo,
                type:    'ticket_reply',
                title:   'Ответ пользователя',
                message: `Пользователь ответил на обращение #${ticket.number}`,
                link:    `/admin/support/${ticketId}`,
              },
            })
          } else {
            const supportUsers = await db.user.findMany({
              where: {
                OR:       [{ isSupport: true }, { role: 'admin' }],
                isBanned: false,
              },
              select: { id: true },
            })
            if (supportUsers.length > 0) {
              await db.notification.createMany({
                data: supportUsers.map((u) => ({
                  userId:  u.id,
                  type:    'ticket_reply',
                  title:   'Ответ пользователя',
                  message: `Пользователь ответил на обращение #${ticket.number}`,
                  link:    `/admin/support/${ticketId}`,
                })),
              })
            }
          }
        }
      } catch (notifyErr) {
        console.error('[message/notify] error:', notifyErr)
      }
    }

    return NextResponse.json({ id: msgId }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/support/[id]/message] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
