// src/app/admin/support/[id]/page.tsx
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminSupportDetailClient from './AdminSupportDetailClient'

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const { id } = await params

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!can(currentUser, 'support')) redirect('/admin/dashboard')

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        include: { attachments: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!ticket) notFound()

  // Get ticket owner info (null for guest tickets)
  const owner = ticket.userId
    ? await db.user.findUnique({
        where: { id: ticket.userId },
        select: { id: true, name: true, email: true, image: true },
      })
    : null

  // Get assigned agent info
  const agent = ticket.assignedTo
    ? await db.user.findUnique({
        where: { id: ticket.assignedTo },
        select: { id: true, name: true },
      })
    : null

  // Get canned responses for this agent
  const cannedResponses = await db.cannedResponse.findMany({
    where:   { createdBy: session.user.id },
    orderBy: { title: 'asc' },
  })

  // Mark staff as having read the ticket
  await db.supportTicket.update({
    where: { id },
    data:  { staffReadAt: new Date() },
  })

  return (
    <AdminSupportDetailClient
      ticket={{
        id:          ticket.id,
        number:      ticket.number,
        subject:     ticket.subject,
        category:    ticket.category,
        priority:    ticket.priority,
        status:      ticket.status,
        assignedTo:  ticket.assignedTo,
        guestEmail:  ticket.guestEmail,
        guestName:   ticket.guestName,
        createdAt:   ticket.createdAt.toISOString(),
        updatedAt:   ticket.updatedAt.toISOString(),
        userReadAt:  ticket.userReadAt?.toISOString() ?? null,
        staffReadAt: new Date().toISOString(),
      }}
      messages={ticket.messages.map(m => ({
        id:         m.id,
        text:       m.text,
        isStaff:    m.isStaff,
        isInternal: m.isInternal,
        authorId:   m.authorId ?? '',
        createdAt:  m.createdAt.toISOString(),
        attachments: m.attachments.map(a => ({
          id: a.id, fileKey: a.fileKey, status: a.status, threat: a.threat,
        })),
      }))}
      owner={
        owner
          ? { id: owner.id, name: owner.name, email: owner.email, image: owner.image }
          : null
      }
      agent={agent}
      agentId={session.user.id}
      isAdmin={currentUser?.role === 'admin'}
      cannedResponses={cannedResponses.map(cr => ({
        id: cr.id, title: cr.title, text: cr.text,
      }))}
    />
  )
}
