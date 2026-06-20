// src/lib/mailer.ts
import nodemailer from 'nodemailer'

// SMTP транспорт — Яндекс почта
export const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'smtp.yandex.ru',
  port:   Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Экранирование HTML — защита от XSS в письмах.
// Имена пользователей и названия товаров вставляются в HTML-шаблон,
// поэтому спецсимволы должны быть заменены на HTML-сущности.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #F0F0F8; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5; }
    .header { background: #0A0A0F; padding: 24px; text-align: center; }
    .logo { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .logo-rev { color: #4880FF; }
    .logo-set { color: #F0EFE8; }
    .body { padding: 32px 28px; }
    .footer { padding: 16px 28px; background: #F5F5F2; text-align: center; font-size: 12px; color: #888; }
    .btn { display: inline-block; background: #4880FF; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; }
    h2 { color: #1A1A1A; font-size: 20px; margin: 0 0 12px; }
    p { color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
    .code { background: #F0F0F8; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #4880FF; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-rev">REV</span><span class="logo-set">SET</span>
      </div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} REVSET · <a href="mailto:support@revset.ru" style="color:#888;">support@revset.ru</a>
    </div>
  </div>
</body>
</html>
  `
}

export async function sendVerificationEmail(to: string, name: string, url: string) {
  const safeName = escapeHtml(name)
  // url приходит от better-auth — не от пользователя, экранировать не нужно,
  // но на всякий случай проверяем что это https/http ссылка
  const safeUrl = url.startsWith('http') ? url : '#'

  await transporter.sendMail({
    from:    `"REVSET" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Подтвердите email — REVSET',
    html:    emailTemplate(`
      <h2>Добро пожаловать, ${safeName}!</h2>
      <p>Для завершения регистрации подтвердите ваш email адрес.</p>
      <div style="text-align: center;">
        <a href="${safeUrl}" class="btn" style="display:inline-block;background-color:#4880FF;color:#ffffff !important;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0;font-family:Arial,sans-serif;">Подтвердить email</a>
      </div>
      <p style="font-size: 12px; color: #999;">Ссылка действительна 24 часа. Если вы не регистрировались на REVSET — просто проигнорируйте это письмо.</p>
    `),
  })
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  const safeName = escapeHtml(name)
  const safeUrl = url.startsWith('http') ? url : '#'

  await transporter.sendMail({
    from:    `"REVSET" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Сброс пароля — REVSET',
    html:    emailTemplate(`
      <h2>Сброс пароля</h2>
      <p>Привет, ${safeName}! Мы получили запрос на сброс пароля для вашего аккаунта.</p>
      <div style="text-align: center;">
        <a href="${safeUrl}" class="btn" style="display:inline-block;background-color:#4880FF;color:#ffffff !important;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0;font-family:Arial,sans-serif;">Сбросить пароль</a>
      </div>
      <p style="font-size: 12px; color: #999;">Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>
    `),
  })
}

export async function sendSaleNotificationEmail(
  to: string,
  authorName: string,
  productName: string,
  amount: number,
) {
  const safeName = escapeHtml(authorName)
  const safeProduct = escapeHtml(productName)

  await transporter.sendMail({
    from:    `"REVSET" <${process.env.SMTP_FROM}>`,
    to,
    subject: `Продажа: ${productName} | REVSET`,
    html:    emailTemplate(`
      <h2>Поздравляем, ${safeName}!</h2>
      <p>Ваша модель была куплена.</p>
      <div style="background:#F0F0F8;border-radius:8px;padding:16px;margin:16px 0;">
        <div style="font-size:13px;color:#888;margin-bottom:4px;">Модель</div>
        <div style="font-size:15px;font-weight:700;color:#1A1A1A;">${safeProduct}</div>
      </div>
      <div style="background:#F0F0F8;border-radius:8px;padding:16px;margin:16px 0;">
        <div style="font-size:13px;color:#888;margin-bottom:4px;">Ваш заработок (80%)</div>
        <div style="font-size:22px;font-weight:700;color:#4880FF;">${Math.round(amount * 0.8)} ₽</div>
      </div>
      <p style="font-size:12px;color:#999;">Выплата поступит на ваш счёт в ближайшую дату выплат.</p>
    `),
  })
}
