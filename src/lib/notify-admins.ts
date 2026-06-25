import { db } from './db'

export async function notifyAdmins(data: {
  type:    string
  title:   string
  message: string
  link?:   string
}) {
  const admins = await db.user.findMany({
    where:  { role: 'admin' },
    select: { id: true },
  })
  if (admins.length === 0) return

  await db.notification.createMany({
    data: admins.map(a => ({
      userId:  a.id,
      type:    data.type,
      title:   data.title,
      message: data.message,
      link:    data.link ?? null,
    })),
  })
}
