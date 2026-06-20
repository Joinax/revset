// src/lib/s3.ts
// Клиент S3 — работает с MinIO локально и Яндекс/Selectel в продакшне
import { S3Client } from '@aws-sdk/client-s3'

if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_ENDPOINT || !process.env.S3_BUCKET) {
  throw new Error('S3 environment variables are not configured: S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT, S3_BUCKET are required')
}

export const s3 = new S3Client({
  endpoint:        process.env.S3_ENDPOINT,
  region:          process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

export const S3_BUCKET = process.env.S3_BUCKET
