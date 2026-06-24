// src/components/ImageUpload.tsx
'use client'

import { useState, useRef } from 'react'

type UploadedImage = {
  fileKey: string
  url:     string
  name:    string
}

type Props = {
  onImagesChange: (images: UploadedImage[], mainIndex: number) => void
  maxImages?:     number
  initialImages?: UploadedImage[]
  entityType?:    'product' | 'avatar'
  entityId?:      string
  fieldName?:     string
}

export default function ImageUpload({
  onImagesChange,
  maxImages     = 6,
  initialImages = [],
  entityType    = 'product',
  entityId      = '',
  fieldName     = 'images',
}: Props) {
  const [images,    setImages]    = useState<UploadedImage[]>(initialImages)
  const [mainIndex, setMainIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    const remaining = maxImages - images.length
    if (remaining <= 0) { setError(`Максимум ${maxImages} изображений`); return }

    const toUpload = Array.from(files).slice(0, remaining)
    setError('')
    setUploading(true)

    const uploaded: UploadedImage[] = []

    for (const file of toUpload) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Разрешены только JPG, PNG, WebP')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Каждое изображение не должно превышать 10 МБ')
        continue
      }

      try {
        // Шаг 1 — получаем presigned URL
        const res = await fetch('/api/upload', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, uploadType: 'image' }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Ошибка загрузки'); continue }
        const { uploadUrl, fileKey } = await res.json()

        // Шаг 2 — загружаем напрямую в S3
        const uploadRes = await fetch(uploadUrl, {
          method:  'PUT',
          headers: { 'Content-Type': file.type },
          body:    file,
        })
        if (!uploadRes.ok) { setError('Ошибка загрузки в хранилище'); continue }

        // Шаг 3 — уведомляем сервер (только если entityId уже известен)
        if (entityId) {
          await fetch('/api/upload/complete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ fileKey, uploadType: 'image', entityType, entityId, fieldName }),
          })
        }

        uploaded.push({ fileKey, url: URL.createObjectURL(file), name: file.name })
      } catch {
        setError('Ошибка соединения')
      }
    }

    const newImages = [...images, ...uploaded]
    setImages(newImages)
    onImagesChange(newImages, mainIndex)
    setUploading(false)
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index)
    const newMain   = index === mainIndex ? 0 : index < mainIndex ? mainIndex - 1 : mainIndex
    setImages(newImages)
    setMainIndex(newMain)
    onImagesChange(newImages, newMain)
  }

  function setAsMain(index: number) {
    setMainIndex(index)
    onImagesChange(images, index)
  }

  return (
    <div>
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {images.map((img, i) => (
            <div key={img.fileKey} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${i === mainIndex ? 'var(--accent)' : 'var(--border)'}` }}>
              <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

              <button type="button" onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                ×
              </button>

              {i === mainIndex ? (
                <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px' }}>
                  Главное
                </span>
              ) : (
                <button type="button" onClick={() => setAsMain(i)}
                  style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', padding: '2px 6px', borderRadius: '3px' }}>
                  Сделать главным
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files) handleFiles(e.target.files) }} />
          {uploading ? (
            <>
              <i className="ti ti-loader" style={{ fontSize: '24px', color: 'var(--accent)', display: 'block', marginBottom: '6px' }} />
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Загружаем...</div>
            </>
          ) : (
            <>
              <i className="ti ti-photo-plus" style={{ fontSize: '24px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>
                {images.length === 0 ? 'Добавить фото' : 'Добавить ещё'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                JPG, PNG, WebP · до 10 МБ · максимум {maxImages} фото
              </div>
            </>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>
          Нажмите «Сделать главным» чтобы выбрать превью карточки
        </div>
      )}

      {error && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--danger)', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
