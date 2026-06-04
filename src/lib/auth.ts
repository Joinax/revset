// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  // Вход и регистрация по email/паролю
  emailAndPassword: {
    enabled:          true,
    minPasswordLength: 8,
  },

  // nextCookies — автоматически устанавливает куки в Server Actions
  plugins: [nextCookies()],
})
