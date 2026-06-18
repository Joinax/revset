// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

// Без явного baseURL — better-auth сам бьёт запросы на тот хост, с которого
// загружена страница. Это важно для разделения по поддоменам: на основном
// домене это localhost:3000, на админке — admin.localhost:3000, у каждого
// свой cookie сессии. Раньше здесь был захардкожен NEXT_PUBLIC_APP_URL,
// из-за чего админский поддомен всегда стучался в сессию основного домена.
export const authClient = createAuthClient()

// Только методы для входа/выхода — без useSession
export const { signIn, signUp, signOut, sendVerificationEmail } = authClient
