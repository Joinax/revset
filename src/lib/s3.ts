// src/lib/s3.ts
// Клиент S3 — работает с MinIO локально и Яндекс/Selectel в продакшне
import { S3Client } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  endpoint:        process.env.S3_ENDPOINT,         // http://localhost:9000 для MinIO
  region:          process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,  // обязательно для MinIO и большинства S3-совместимых хранилищ
})

export const S3_BUCKET = process.env.S3_BUCKET ?? 'revset'
