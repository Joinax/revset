// src/app/api/contact/route.ts
// Public contact form — no auth required (for users who can't log in)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendMailWithTimeout } from '@/lib/mailer'

const schema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email().max(200),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
})

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>')
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Неверные данные' }, { status: 400 })
    }
    const { name, email, subject, message } = parsed.data

    await sendMailWithTimeout({
      from:    process.env.SMTP_USER,
      to:      process.env.SMTP_USER,
      replyTo: `"${name}" <${email}>`,
      subject: `[Форма обратной связи] ${subject}`,
      html: `
        <p><strong>Имя:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Тема:</strong> ${escapeHtml(subject)}</p>
        <hr>
        <p>${escapeHtml(message)}</p>
      `,
    }, 15_000)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка'
    console.error('[POST /api/contact]', msg)
    // Don't expose SMTP details to client
    const isTimeout = msg.includes('timeout')
    return NextResponse.json(
      { error: isTimeout ? 'Сервер почты не отвечает, попробуйте позже' : 'Ошибка отправки' },
      { status: 503 }
    )
  }
}
