// src/lib/auth.ts — обновлённый с email подтверждением и сбросом пароля
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'
import { sendVerificationEmail, sendPasswordResetEmail } from './mailer'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

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

  plugins: [nextCookies()],
})
