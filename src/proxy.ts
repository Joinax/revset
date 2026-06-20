// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostHeader = request.headers.get('host') ?? ''
  const hostname = hostHeader.split(':')[0]
  const isAdminHost = hostname.startsWith('admin.')
  const sessionCookie = getSessionCookie(request)
  const origin = `${request.nextUrl.protocol}//${hostHeader}`

  const isInternal =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')

  const isStaticAsset = /\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?|ttf|map|json|txt|xml)$/.test(pathname)

  if (!isInternal && !isStaticAsset) {
    if (isAdminHost && !pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', origin))
    }
    if (!isAdminHost && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', origin))
    }
  }

  if (!isInternal) {
    const isAdminPath       = pathname.startsWith('/admin')
    const isMaintenancePage = pathname === '/maintenance'

    if (!isAdminPath) {
      try {
        // Строим URL для maintenance-check из переменной окружения, а не из
        // request.url — request.url наследует nextUrl, который в middleware
        // может содержать внутренний адрес Next.js, а не реальный хост.
        // Подмена Host-заголовка извне также не должна влиять на этот запрос.
        const internalBase = process.env.APP_URL ?? 'http://localhost:3000'
        const statusRes = await fetch(`${internalBase}/api/maintenance-status`)
        const { maintenance } = await statusRes.json()

        if (maintenance && !isMaintenancePage) {
          return NextResponse.redirect(new URL('/maintenance', origin))
        }
        if (!maintenance && isMaintenancePage) {
          return NextResponse.redirect(new URL('/', origin))
        }
      } catch {}
    }
  }

  // Защита админки
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', origin))
    }

    // Аналогично maintenance — строим URL из env, не из request.url
    const internalBase = process.env.APP_URL ?? 'http://localhost:3000'
    const sessionRes = await fetch(`${internalBase}/api/auth/get-session`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    })

    const session = await sessionRes.json()

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', origin))
    }

    return NextResponse.next()
  }

  // Защищённые маршруты
  const protectedPaths = ['/account', '/author-dashboard']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const authPaths = ['/login', '/register']
  const isAuthPage = authPaths.some(path => pathname.startsWith(path))

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/', origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
