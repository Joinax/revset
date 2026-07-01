// src/instrumentation.node.ts
// Node.js-only startup code — импортируется из instrumentation.ts через require()
// чтобы Turbopack не включал Node.js API в Edge-бандл.
import { logSystem } from './lib/system-log'

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i) // 2s, 4s
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

export async function registerNode() {
  await import('./lib/env')

  // --- Обработчики краша ---

  process.on('uncaughtException', (err: Error) => {
    logSystem('fatal', 'uncaught_exception', err.message, {
      name:  err.name,
      stack: err.stack,
    })
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
    withRetry(() => startWorker()).catch(err => {
      logSystem('error', 'worker_error', `Воркер не запустился: ${err.message}`, { stack: err.stack })
    })
  })

  // --- Восстановление паков застрявших в BUILDING_BUNDLE ---
  // Если сервер был перезапущен во время генерации архива, паки остаются
  // в статусе BUILDING_BUNDLE. Перезапускаем генерацию при старте.
  Promise.all([
    import('./lib/db'),
    import('./lib/generate-pack-bundle'),
  ]).then(async ([{ db }, { generatePackBundle }]) => {
    const stuck = await withRetry(() => db.pack.findMany({
      where:  { moderationStatus: 'BUILDING_BUNDLE' },
      select: { id: true, name: true },
    }))
    for (const pack of stuck) {
      logSystem('info', 'bundle_recovery', `Восстановление генерации архива: пак ${pack.id} («${pack.name}»)`)
      generatePackBundle(pack.id).catch(err => {
        logSystem('error', 'bundle_recovery_failed',
          `Ошибка восстановления архива для пака ${pack.id}: ${err.message}`, { stack: err.stack })
      })
    }
  }).catch(err => {
    logSystem('error', 'bundle_recovery_error', `Не удалось проверить паки в BUILDING_BUNDLE: ${err.message}`)
  })

  // --- Запись факта старта ---
  logSystem('info', 'startup', `Сервер запущен (PID ${process.pid})`, {
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  })
}
