// src/components/ProductGallery.tsx
'use client'

import { useState } from 'react'

type Props = {
  images:      string[]   // массив fileKey из S3
  productName: string
  emoji:       string
  previewBg:   string
  s3Endpoint:  string     // передаём из серверного компонента
  s3Bucket:    string
}

export default function ProductGallery({
  images, productName, emoji, previewBg, s3Endpoint, s3Bucket,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Формируем публичные URL из fileKey
  // Для MinIO: http://localhost:9000/revset/images/...
  // Для Яндекс S3: https://storage.yandexcloud.net/revset/images/...
  function getImageUrl(fileKey: string) {
    return `${s3Endpoint}/${s3Bucket}/${fileKey}`
  }

  // Если нет изображений — показываем эмодзи заглушку
  if (!images || images.length === 0) {
    return (
      <div style={{
        background: previewBg, borderRadius: '14px',
        height: '300px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '90px', marginBottom: '12px',
        border: '1px solid var(--border)',
      }}>
        {emoji}
      </div>
    )
  }

  return (
    <div>
      {/* Главное изображение */}
      <div style={{
        borderRadius: '14px', overflow: 'hidden',
        height: '300px', marginBottom: '12px',
        border: '1px solid var(--border)',
        background: previewBg,
        position: 'relative',
      }}>
        <img
          src={getImageUrl(images[activeIndex])}
          alt={`${productName} — фото ${activeIndex + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Счётчик */}
        {images.length > 1 && (
          <span style={{
            position: 'absolute', bottom: '12px', right: '12px',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: '12px', padding: '4px 8px', borderRadius: '4px',
          }}>
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Миниатюры */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
          {images.map((key, i) => (
            <button
              key={key}
              onClick={() => setActiveIndex(i)}
              style={{
                width: '60px', height: '60px', borderRadius: '8px',
                overflow: 'hidden', flexShrink: 0, border: 'none',
                padding: 0, cursor: 'pointer',
                outline: activeIndex === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                outlineOffset: '2px',
              }}
            >
              <img src={getImageUrl(key)} alt={`фото ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
