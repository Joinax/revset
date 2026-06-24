// src/instrumentation.ts
// Next.js 16 автоматически вызывает этот файл при старте сервера.
// Импорт env.ts здесь гарантирует что валидация запустится ДО того
// как приложение начнёт принимать запросы.
export async function register() {
  // Импортируем только на сервере — не в браузере
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env')
  }
}
