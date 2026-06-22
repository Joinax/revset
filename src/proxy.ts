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
        // Используем APP_URL для maintenance-check — этот роут всегда на основном домене
        const internalBase = process.env.APP_URL ?? origin
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

    // Для session check используем реальный origin запроса — иначе на поддомене
    // admin.* сессия не найдётся если APP_URL указывает на основной домен
    // Проверяем только наличие cookie — достаточно для редиректа неавторизованных.
    // Реальная проверка роли происходит в admin/layout.tsx через auth.api.getSession
    return NextResponse.next()
  }

  // Защищённые маршруты
  const protectedPaths = ['/account', '/product-edit']
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
