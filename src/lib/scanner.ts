// src/lib/scanner.ts
// Заглушка ClamAV — заменить после настройки сервера с Docker
// docker run -d --name clamav -p 3310:3310 clamav/clamav:stable

export async function scanFile(
  _fileKey: string
): Promise<{ clean: boolean; threat?: string }> {
  if (process.env.NODE_ENV === 'production' && !process.env.CLAMAV_HOST) {
    throw new Error('ClamAV не настроен — загрузка файлов недоступна в продакшне без антивирусной проверки')
  }
  // TODO: подключить ClamAV через TCP 3310
  // const net = await import('net')
  // Скачать файл из S3 стримом → отправить в ClamAV сокет → получить результат
  return { clean: true }
}
