// src/lib/auth.ts — с email подтверждением, сбросом пароля и rate limiting
import { betterAuth, APIError } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'
import { db } from './db'
import { sendVerificationEmail, sendPasswordResetEmail } from './mailer'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  // Основной домен и поддомен админки — у каждого свой cookie сессии,
  // better-auth должен доверять обоим как валидным источникам запросов
  trustedOrigins: [
    'http://revset.test:3000',
    'http://admin.revset.test:3000',
    // продакшен-домены добавить сюда после переноса: 'https://revset.ru', 'https://admin.revset.ru'
  ],

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled:           true,
    minPasswordLength: 8,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name ?? 'Пользователь', url)
    },
  },

  emailVerification: {
    sendOnSignUp:         true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, user.name ?? 'Пользователь', url)
    },
  },

  // Защита от брутфорса — особенно важно для /admin/login
  rateLimit: {
    enabled: true,
    window:  60,   // окно в секундах
    max:     100,  // лимит по умолчанию для всех auth-эндпоинтов

    customRules: {
      // Вход — самый чувствительный эндпоинт, ужесточаем
      '/sign-in/email': {
        window: 60,
        max:    5,   // 5 попыток входа в минуту с одного IP
      },
      // Запрос сброса пароля — защита от спама письмами
      '/forget-password': {
        window: 60,
        max:    3,
      },
    },
  },

  // Блокируем вход для забаненных пользователей — до этого isBanned
  // сохранялся в БД, но никак не проверялся при логине
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-in/email') {
        const email = ctx.body?.email
        if (email) {
          const user = await db.user.findUnique({ where: { email }, select: { isBanned: true } })
          if (user?.isBanned) {
            throw new APIError('FORBIDDEN', { message: 'Аккаунт заблокирован. Обратитесь в поддержку.' })
          }
        }
      }
    }),
  },

  plugins: [nextCookies()],
})
