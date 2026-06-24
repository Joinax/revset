import type { NextConfig } from 'next'

const securityHeaders = [
  // Запрещает браузеру угадывать тип контента — защита от MIME-sniffing атак
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Запрещает встраивать сайт в iframe на других доменах — защита от clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Включает XSS-фильтр в старых браузерах
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Запрещает передавать Referer на другие домены
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Разрешает только HTTPS в течение 1 года — включать только в продакшене
  // В dev закомментировано чтобы не сломать localhost
  // {
  //   key: 'Strict-Transport-Security',
  //   value: 'max-age=31536000; includeSubDomains',
  // },
  // Content Security Policy — ограничивает откуда браузер может загружать ресурсы.
  // Защищает от XSS: даже если злоумышленник вставил <script>, браузер его не выполнит.
  // 'unsafe-inline' и 'unsafe-eval' нужны для Next.js и Tailwind — без них сайт сломается.
  // При необходимости добавить внешние домены (шрифты, аналитика) — добавлять сюда явно.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // скрипты — только свои + inline (нужен Next.js)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // стили — только свои + inline (нужен Tailwind)
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // шрифты — только свои
      "font-src 'self' https://cdn.jsdelivr.net",
      // изображения — свои + data: (для base64) + S3
      `img-src 'self' data: blob: ${process.env.S3_ENDPOINT ?? ''} ${process.env.S3_PUBLIC_ENDPOINT ?? ''}`.trim(),
      // медиа — только свои
      "media-src 'self'",
      // API запросы — только свои домены
      `connect-src 'self' https://cdn.jsdelivr.net ${process.env.S3_ENDPOINT ?? ''} ${process.env.S3_PUBLIC_ENDPOINT ?? ''}`.trim(),
      // объекты (Flash и т.п.) — запрещены
      "object-src 'none'",
      // базовый URL — только свой домен
      "base-uri 'self'",
      // формы — только свой домен
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ['admin.revset.test:3000', 'revset.test:3000'],

  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'better-auth',
  ],

  turbopack: {
    resolveAlias: {
      '@prisma/client':    '@prisma/client',
      'react':             'react',
      'react-dom':         'react-dom',
      'better-auth/react': 'better-auth/react',
    },
  },

  async headers() {
    return [
      {
        // Применяем заголовки ко всем маршрутам
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
