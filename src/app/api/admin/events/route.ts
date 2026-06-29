import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { onAdminEvent } from '@/lib/admin-events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response('Forbidden', { status: 403 })

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!user || user.isBanned || user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Начальный пинг — подтверждает соединение
      controller.enqueue(encoder.encode(': connected\n\n'))

      const unsub = onAdminEvent((event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch { /* соединение уже закрыто */ }
      })

      // Keep-alive каждые 25 секунд (прокси обычно закрывают idle после 30s)
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
        }
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        unsub()
        clearInterval(ping)
        try { controller.close() } catch { /* уже закрыт */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
