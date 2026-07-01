// src/app/api/support/[id]/attachment/[attachId]/route.ts
// Proxy: streams attachment from S3 — presigned URLs are never exposed to clients
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import { s3, S3_BUCKET } from '@/lib/s3'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachId: string }> }
) {
  try {
    const { id: ticketId, attachId } = await params

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, isBanned: true, isSupport: true, isModerator: true },
    })
    if (!currentUser || currentUser.isBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch attachment and verify it belongs to a message in the specified ticket
    const attachment = await db.ticketAttachment.findUnique({
      where:   { id: attachId },
      include: { message: { select: { ticketId: true } } },
    })

    if (!attachment || attachment.message.ticketId !== ticketId) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    // Fetch ticket to verify access
    const ticket = await db.supportTicket.findUnique({
      where:  { id: ticketId },
      select: { userId: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    // Access check: ticket owner or support staff
    const isOwner = ticket.userId === session.user.id
    const isStaff = can(currentUser, 'support')
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Status-based responses
    if (attachment.status === 'SCANNING') {
      return NextResponse.json({ status: 'scanning' }, { status: 202 })
    }

    if (attachment.status === 'REJECTED') {
      return NextResponse.json({ status: 'rejected' }, { status: 410 })
    }

    // Status === CLEAN: stream from S3
    const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: attachment.fileKey }))

    const fileName    = attachment.fileKey.split('/').pop() ?? 'file'
    const contentType = obj.ContentType ?? 'application/octet-stream'

    return new Response(obj.Body as ReadableStream, {
      headers: {
        'Content-Type':              contentType,
        'X-Content-Type-Options':    'nosniff',
        'Content-Disposition':       `attachment; filename="${fileName}"`,
        'Cache-Control':             'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[GET /api/support/[id]/attachment/[attachId]] error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
