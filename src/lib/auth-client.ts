// src/lib/auth-client.ts
// Клиент для использования в Client Components ('use client')
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

// Удобные хуки и методы
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
