// src/lib/scanner.ts
// Заглушка ClamAV — заменить после настройки сервера с Docker
// docker run -d --name clamav -p 3310:3310 clamav/clamav:stable

export async function scanFile(
  _fileKey: string
): Promise<{ clean: boolean; threat?: string }> {
  // TODO: подключить ClamAV через TCP 3310
  // const net = await import('net')
  // Скачать файл из S3 стримом → отправить в ClamAV сокет → получить результат
  return { clean: true }
}
