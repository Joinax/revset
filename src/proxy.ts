// src/proxy.ts
// Next.js 16 использует proxy.ts вместо middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  // Защищённые маршруты — редирект на /login если нет сессии
  const protectedPaths = ['/account', '/author-dashboard']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Если залогинен и заходит на /login или /register — редирект на главную
  const authPaths = ['/login', '/register']
  const isAuthPage = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*', '/author-dashboard/:path*', '/login', '/register'],
}
