// src/app/api/contact/route.ts
// Public contact form — creates a guest SupportTicket (no auth required)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { TICKET_CATEGORIES } from '@/lib/ticket-categories'

const schema = z.object({
  name:    z.string().min(1).max(100).trim(),
  email:   z.string().email().max(200).trim(),
  subject: z.string().min(3).max(200).trim(),
  message: z.string().min(10).max(5000).trim(),
  // subject is "[Category] first-60-chars" from the client
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }
    const { name, email, subject, message } = parsed.data

    // Detect category from subject prefix "[Category] ..."
    const catMatch = subject.match(/^\[([^\]]+)\]/)
    const catLabel = catMatch?.[1] ?? 'OTHER'
    // Map label back to enum key
    const categoryKey = Object.entries(TICKET_CATEGORIES).find(
      ([, v]) => v.label === catLabel
    )?.[0] as keyof typeof TICKET_CATEGORIES | undefined
    const category = categoryKey ?? 'OTHER'
    const priority = TICKET_CATEGORIES[category].priority

    // Rate-limit: max 3 open guest tickets from same email
    const openGuestCount = await db.supportTicket.count({
      where: { guestEmail: email, status: { not: 'CLOSED' } },
    })
    if (openGuestCount >= 3) {
      return NextResponse.json(
        { error: 'Вы уже отправили 3 обращения. Ожидайте ответа на указанный email.' },
        { status: 429 }
      )
    }

    const ticket = await db.supportTicket.create({
      data: {
        userId:    null,
        guestEmail: email,
        guestName:  name,
        subject,
        category,
        priority,
        status:   'AWAITING_SUPPORT',
        messages: {
          create: {
            authorId: null,
            isStaff:  false,
            text:     message,
          },
        },
      },
      select: { id: true, number: true },
    })

    // Notify support staff
    const supportUsers = await db.user.findMany({
      where:  { OR: [{ isSupport: true }, { role: 'admin' }], isBanned: false },
      select: { id: true },
    })
    if (supportUsers.length > 0) {
      await db.notification.createMany({
        data: supportUsers.map(u => ({
          userId:  u.id,
          type:    'new_ticket',
          title:   'Новое обращение (гость)',
          message: `#${ticket.number} от ${name} <${email}>: ${subject}`,
          link:    `/admin/support/${ticket.id}`,
        })),
      })
    }

    return NextResponse.json({ ok: true, number: ticket.number })
  } catch (err) {
    console.error('[POST /api/contact]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
