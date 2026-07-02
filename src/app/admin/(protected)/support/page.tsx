// src/app/admin/support/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { can } from '@/lib/permissions'
import AdminSupportClient from './AdminSupportClient'

export default async function AdminSupportPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isBanned: true, isSupport: true, isModerator: true },
  })
  if (!can(user, 'support')) redirect('/admin/dashboard')

  // Fetch unassigned tickets for initial load
  const unassignedTickets = await db.supportTicket.findMany({
    where: { assignedTo: null, status: { not: 'CLOSED' } },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
    include: { _count: { select: { messages: true } } },
  })

  const myTickets = await db.supportTicket.findMany({
    where: { assignedTo: session.user.id, status: { not: 'CLOSED' } },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
    include: { _count: { select: { messages: true } } },
  })

  return (
    <AdminSupportClient
      agentId={session.user.id}
      initialUnassigned={unassignedTickets.map(t => ({
        id: t.id, number: t.number, subject: t.subject,
        category: t.category, priority: t.priority, status: t.status,
        assignedTo: t.assignedTo,
        updatedAt: t.updatedAt.toISOString(), createdAt: t.createdAt.toISOString(),
        messageCount: t._count.messages,
      }))}
      initialMine={myTickets.map(t => ({
        id: t.id, number: t.number, subject: t.subject,
        category: t.category, priority: t.priority, status: t.status,
        assignedTo: t.assignedTo,
        updatedAt: t.updatedAt.toISOString(), createdAt: t.createdAt.toISOString(),
        messageCount: t._count.messages,
      }))}
    />
  )
}
