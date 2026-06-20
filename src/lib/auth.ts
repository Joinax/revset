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

  rateLimit: {
    enabled: true,
    window:  60,
    max:     100,

    customRules: {
      // Вход — самый чувствительный эндпоинт
      '/sign-in/email': {
        window: 60,
        max:    5,   // 5 попыток в минуту с одного IP
      },
      // Регистрация — защита от массового создания аккаунтов ботами
      '/sign-up/email': {
        window: 3600, // 1 час
        max:    5,    // 5 регистраций в час с одного IP
      },
      // Сброс пароля — защита от спама письмами
      '/forget-password': {
        window: 60,
        max:    3,
      },
      // Повторная отправка письма верификации — защита от спама
      '/send-verification-email': {
        window: 60,
        max:    2,
      },
    },
  },

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
