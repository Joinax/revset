// src/proxy.ts
// Next.js 16 использует proxy.ts вместо middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)

  // Защита админки — проверяем роль через API
  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    })

    const session = await sessionRes.json()

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  }

  // Защищённые маршруты — редирект на /login если нет сессии
  const protectedPaths = ['/account', '/author-dashboard']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Если залогинен и заходит на /login или /register — редирект на главную
  const authPaths = ['/login', '/register']
  const isAuthPage = authPaths.some(path => pathname.startsWith(path))

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/author-dashboard/:path*', '/login', '/register'],
}
