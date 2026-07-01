// src/lib/system-log.ts
// Системный журнал: пишет в БД (для просмотра в админке) +
// синхронно в файл (гарантировано сохраняется даже при краше процесса).
// fs/path импортируются лениво внутри функций — иначе Edge Runtime упадёт при сборке.

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal'

export type LogEvent =
  | 'startup'
  | 'shutdown'
  | 'memory_warning'
  | 'uncaught_exception'
  | 'unhandled_rejection'
  | 'worker_error'
  | 'bundle_recovery'
  | 'bundle_recovery_failed'
  | 'bundle_recovery_error'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 МБ — ротация

function writeToFile(level: LogLevel, event: LogEvent, message: string, details?: unknown) {
  // process.cwd недоступен в Edge Runtime — выходим
  if (typeof process === 'undefined' || typeof process.cwd !== 'function') return
  try {
    // Ленивый импорт — не ломает Edge Runtime при сборке
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs   = require('fs')   as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')

    const logDir  = path.join(process.cwd(), 'logs')
    const logFile = path.join(logDir, 'server.log')

    try { fs.mkdirSync(logDir, { recursive: true }) } catch { /* */ }

    try {
      const stat = fs.statSync(logFile)
      if (stat.size > MAX_FILE_BYTES) fs.renameSync(logFile, logFile + '.old')
    } catch { /* файл не существует — ок */ }

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      message,
      ...(details !== undefined ? { details } : {}),
    }) + '\n'

    fs.appendFileSync(logFile, line, 'utf8')
  } catch { /* файловый лог не должен ронять процесс */ }
}

async function writeToDB(level: LogLevel, event: LogEvent, message: string, details?: unknown) {
  try {
    const { db } = await import('./db')
    await db.systemLog.create({
      data: {
        level,
        event,
        message,
        details: details !== undefined ? (details as object) : undefined,
      },
    })
  } catch { /* БД не должна ронять обработчик краша */ }
}

export function logSystem(
  level: LogLevel,
  event: LogEvent,
  message: string,
  details?: unknown,
) {
  const prefix = `[${level.toUpperCase()}][${event}]`
  if (level === 'info') console.log(prefix, message)
  else if (level === 'warn') console.warn(prefix, message)
  else console.error(prefix, message, details ?? '')

  writeToFile(level, event, message, details)
  writeToDB(level, event, message, details).catch(() => {})
}
