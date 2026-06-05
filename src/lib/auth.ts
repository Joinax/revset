// src/lib/auth.ts — обновлённый с email подтверждением и сбросом пароля
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'
import { sendVerificationEmail, sendPasswordResetEmail } from './mailer'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  emailAndPassword: {
    enabled:           true,
    minPasswordLength: 8,
    // Требуем подтверждение email
    requireEmailVerification: true,

    // Отправка письма сброса пароля
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name ?? 'Пользователь', url)
    },
  },

  // Подтверждение email
  emailVerification: {
    sendOnSignUp:         true,   // отправлять сразу при регистрации
    autoSignInAfterVerification: true,  // авто-вход после подтверждения

    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, user.name ?? 'Пользователь', url)
    },
  },

  plugins: [nextCookies()],
})
