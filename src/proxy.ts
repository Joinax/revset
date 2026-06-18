// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // request.nextUrl.hostname ненадёжен — Next.js строит его от адреса,
  // на котором поднят сам сервер, а не от реального запроса. Берём
  // настоящий хост из заголовка Host (подтверждено логом в проде).
  const hostHeader = request.headers.get('host') ?? ''
  const hostname = hostHeader.split(':')[0]
  // admin.revset.test (разработка) / admin.revset.ru (продакшен) — любой хост
  // с префиксом admin. считается админским
  const isAdminHost = hostname.startsWith('admin.')
  const sessionCookie = getSessionCookie(request)
  // Базовый адрес для редиректов в браузер — строим из настоящего хоста,
  // а не из request.url (он наследует тот же ненадёжный nextUrl)
  const origin = `${request.nextUrl.protocol}//${hostHeader}`

  const isInternal =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')

  // Статика (иконки, шрифты, картинки из /public) — пропускаем мимо
  // разделения по хосту, иначе админский поддомен не сможет их загрузить
  const isStaticAsset = /\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?|ttf|map|json|txt|xml)$/.test(pathname)

  // Разделение по поддомену: admin.* отдаёт только /admin/*, основной домен
  // больше не отдаёт /admin/* вообще — это и даёт раздельные сессии/cookie,
  // так как браузер хранит cookie отдельно для каждого хоста
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

    // Режим обслуживания не проверяем для всей админки (включая /admin/login)
    if (!isAdminPath) {
      try {
        const statusRes = await fetch(new URL('/api/maintenance-status', request.url))
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
    // /admin/login — без проверки сессии здесь;
    // сама страница редиректит залогиненных админов на /admin/dashboard
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', origin))
    }

    const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
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
