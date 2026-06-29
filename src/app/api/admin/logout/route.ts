import { NextResponse } from 'next/server'

// GET /api/admin/logout — возвращает HTML-страницу, которая делает POST на better-auth
// и тот сам корректно сбрасывает HttpOnly-куку better-auth.session_token
export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Выход...</title></head>
<body>
<p>Сбрасываем сессию...</p>
<form id="f" method="POST" action="/api/auth/sign-out">
  <input type="hidden" name="_" value="1"/>
</form>
<script>
  fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' })
    .finally(() => { window.location.replace('/admin/login') })
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
