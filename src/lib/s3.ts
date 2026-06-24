// src/lib/s3.ts
import { S3Client } from '@aws-sdk/client-s3'

if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_ENDPOINT || !process.env.S3_BUCKET) {
  throw new Error('S3 environment variables are not configured: S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT, S3_BUCKET are required')
}

// Основной клиент — для серверных операций (CopyObject, DeleteObject, GetObject)
export const s3 = new S3Client({
  endpoint:   process.env.S3_ENDPOINT,
  region:     process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle:             true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

// Клиент для генерации presigned URL — использует публичный endpoint
// чтобы подпись совпадала с host заголовком который браузер отправит в MinIO
export const s3Public = new S3Client({
  endpoint:   process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
  region:     process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle:             true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

export const S3_BUCKET = process.env.S3_BUCKET
