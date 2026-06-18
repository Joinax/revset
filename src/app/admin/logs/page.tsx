// src/app/admin/logs/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminLogsClient from './AdminLogsClient'

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; adminId?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params  = await searchParams
  const action  = params.action  ?? 'all'
  const adminId = params.adminId ?? 'all'
  const page    = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 30

  const where: any = {}
  if (action !== 'all')  where.action  = action
  if (adminId !== 'all') where.adminId = adminId

  const [logs, total, admins] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        admin: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    db.adminAuditLog.count({ where }),
    // Список админов для фильтра — только те, кто реально что-то делал
    db.adminAuditLog.findMany({
      distinct: ['adminId'],
      select: { admin: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <AdminLogsClient
      logs={logs.map(l => ({
        id:         l.id,
        action:     l.action,
        targetType: l.targetType,
        targetId:   l.targetId,
        details:    l.details as Record<string, unknown> | null,
        createdAt:  l.createdAt.toISOString(),
        adminName:  l.admin.name,
        adminEmail: l.admin.email,
        adminImage: l.admin.image,
      }))}
      admins={admins.map(a => ({ id: a.admin.id, name: a.admin.name }))}
      total={total}
      currentPage={page}
      perPage={PER_PAGE}
      currentAction={action}
      currentAdminId={adminId}
    />
  )
}
