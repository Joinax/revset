// src/app/admin/settings/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminSettingsClient from './AdminSettingsClient'

export default async function AdminSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') redirect('/')

  const [settings, categories] = await Promise.all([
    db.setting.findMany(),
    db.category.findMany({ orderBy: { order: 'asc' } }),
  ])

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

  return (
    <AdminSettingsClient
      settings={{
        platformName:        settingsMap['platform_name']        ?? 'REVSET',
        platformDescription: settingsMap['platform_description'] ?? '',
        commission:          settingsMap['commission']            ?? '20',
        minPayout:           settingsMap['min_payout']           ?? '500',
        autoPublish:         settingsMap['auto_publish']         ?? 'false',
        maintenanceMode:     settingsMap['maintenance_mode']     ?? 'false',
        emailNewOrder:       settingsMap['email_new_order']      ?? 'true',
        emailNewAuthor:      settingsMap['email_new_author']     ?? 'true',
      }}
      categories={categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '📦', order: c.order }))}
    />
  )
}
