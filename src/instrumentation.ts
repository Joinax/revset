// src/instrumentation.ts
// Next.js вызывает register() один раз при старте сервера.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env')

    // Динамический импорт — system-log.ts не попадает в Edge-бандл
    const { logSystem } = await import('./lib/system-log')

    // --- Обработчики краша ---

    process.on('uncaughtException', (err: Error) => {
      logSystem('fatal', 'uncaught_exception', err.message, {
        name:  err.name,
        stack: err.stack,
      })
      // 500 мс чтобы запись успела сброситься на диск
      setTimeout(() => process.exit(1), 500)
    })

    process.on('unhandledRejection', (reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack   = reason instanceof Error ? reason.stack  : undefined
      logSystem('error', 'unhandled_rejection', message, { stack })
    })

    process.on('SIGTERM', () => {
      logSystem('info', 'shutdown', 'Получен SIGTERM — завершение процесса')
      setTimeout(() => process.exit(0), 300)
    })

    // --- Мониторинг памяти: предупреждение если куча > 80% ---

    setInterval(() => {
      const mem  = process.memoryUsage()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const v8   = require('v8') as typeof import('v8')
      const heap = v8.getHeapStatistics()
      const usedMb  = Math.round(mem.heapUsed  / 1024 / 1024)
      const limitMb = Math.round(heap.heap_size_limit / 1024 / 1024)
      const pct = usedMb / limitMb

      if (pct >= 0.8) {
        logSystem('warn', 'memory_warning',
          `Высокое использование памяти: ${usedMb} МБ из ${limitMb} МБ (${Math.round(pct * 100)}%)`,
          { heapUsedMb: usedMb, heapLimitMb: limitMb, rssMb: Math.round(mem.rss / 1024 / 1024) }
        )
      }
    }, 60_000).unref()

    // --- Старт воркера ---

    import('./lib/worker').then(({ startWorker }) => {
      startWorker().catch(err => {
        logSystem('error', 'worker_error', `Воркер не запустился: ${err.message}`, { stack: err.stack })
      })
    })

    // --- Запись факта старта ---
    logSystem('info', 'startup', `Сервер запущен (PID ${process.pid})`, {
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
    })
  }
}
