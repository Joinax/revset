// src/instrumentation.ts
// Next.js вызывает register() один раз при старте сервера.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ENV валидация — должна завершиться до старта
    await import('./lib/env')

    // Worker запускаем без await — он работает бесконечно в фоне
    // Ошибки не глушим — они уйдут в unhandledRejection → server.js
    import('./lib/worker').then(({ startWorker }) => {
      startWorker().catch(err => {
        console.error('[instrumentation] worker failed to start:', err)
      })
    })
  }
}
