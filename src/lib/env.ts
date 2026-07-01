// src/lib/env.ts
// Валидация переменных окружения при старте приложения.
// Если какая-то переменная отсутствует — приложение падает сразу с понятной ошибкой,
// а не в рантайме когда пользователь уже пытается что-то сделать.
import { z } from 'zod'

const envSchema = z.object({
  // База данных
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен')
    .startsWith('postgresql://', 'DATABASE_URL должен начинаться с postgresql://'),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET должен быть минимум 32 символа'),
  BETTER_AUTH_URL:    z.string().url('BETTER_AUTH_URL должен быть валидным URL'),

  // Публичные URL
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL должен быть валидным URL'),

  // ЮKassa
  YOOKASSA_SHOP_ID:    z.string().min(1, 'YOOKASSA_SHOP_ID обязателен'),
  YOOKASSA_SECRET_KEY: z.string().min(1, 'YOOKASSA_SECRET_KEY обязателен'),

  // S3
  S3_ENDPOINT:   z.string().url('S3_ENDPOINT должен быть валидным URL'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY обязателен'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY обязателен'),
  S3_BUCKET:     z.string().min(1, 'S3_BUCKET обязателен'),
  S3_REGION:     z.string().min(1, 'S3_REGION обязателен'),

  // Публичные S3
  NEXT_PUBLIC_S3_ENDPOINT: z.string().url('NEXT_PUBLIC_S3_ENDPOINT должен быть валидным URL'),
  NEXT_PUBLIC_S3_BUCKET:   z.string().min(1, 'NEXT_PUBLIC_S3_BUCKET обязателен'),

  // SMTP
  SMTP_HOST:     z.string().min(1, 'SMTP_HOST обязателен'),
  SMTP_PORT:     z.coerce.number().int().positive('SMTP_PORT должен быть положительным числом'),
  SMTP_USER:     z.string().email('SMTP_USER должен быть валидным email'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD обязателен'),
  SMTP_FROM:     z.string().email('SMTP_FROM должен быть валидным email'),

  // CRON
  CRON_SECRET: z.string().min(32, 'CRON_SECRET должен быть минимум 32 символа'),

  // APP URL (дубль NEXT_PUBLIC_APP_URL для серверного использования)
  APP_URL: z.string().url('APP_URL должен быть валидным URL'),
})

// Запускаем валидацию. parse() бросает исключение если что-то не так —
// приложение не запустится пока все переменные не будут корректны.
const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Ошибка конфигурации — отсутствуют или некорректны переменные окружения:\n')
  
  const errors = result.error.flatten().fieldErrors
  for (const [field, messages] of Object.entries(errors)) {
    console.error(`  ${field}: ${messages?.join(', ')}`)
  }
  
  console.error('\nПроверь файл .env и перезапусти приложение.\n')
  throw new Error('Invalid environment configuration — see errors above')
}

export const env = result.data
