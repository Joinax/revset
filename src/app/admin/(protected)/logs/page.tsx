// src/app/admin/logs/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminLogsClient from './AdminLogsClient'

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; adminId?: string; page?: string; tab?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const params = await searchParams
  const tab    = params.tab === 'system' ? 'system' : 'admin'
  const page   = Math.max(1, Number(params.page ?? 1))
  const PER_PAGE = 30

  if (tab === 'system') {
    const [systemLogs, total] = await Promise.all([
      db.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      db.systemLog.count(),
    ])

    return (
      <AdminLogsClient
        tab="system"
        logs={[]}
        admins={[]}
        total={0}
        currentPage={1}
        perPage={PER_PAGE}
        currentAction="all"
        currentAdminId="all"
        systemLogs={systemLogs.map(l => ({
          id:        l.id,
          level:     l.level,
          event:     l.event,
          message:   l.message,
          details:   l.details as Record<string, unknown> | null,
          createdAt: l.createdAt.toISOString(),
        }))}
        systemTotal={total}
        systemPage={page}
      />
    )
  }

  const action  = params.action  ?? 'all'
  const adminId = params.adminId ?? 'all'

  const where: Record<string, unknown> = {}
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
    db.adminAuditLog.findMany({
      distinct: ['adminId'],
      select: { admin: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <AdminLogsClient
      tab="admin"
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
      systemLogs={[]}
      systemTotal={0}
      systemPage={1}
    />
  )
}
