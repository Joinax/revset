// src/components/FileUpload.tsx
// Компонент загрузки RFA файла — используется в кабинете автора
'use client'

import { useState, useRef } from 'react'

type Props = {
  onUpload: (fileKey: string, fileName: string) => void
}

export default function FileUpload({ onUpload }: Props) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')
  const [uploaded,  setUploaded]  = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.rfa')) {
      setError('Разрешены только файлы формата .rfa')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Файл не должен превышать 50 МБ')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      // Шаг 1 — получаем presigned URL
      const res = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadType: 'rfa',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Ошибка получения URL')
      }

      const { uploadUrl, fileKey } = await res.json()

      // Шаг 2 — загружаем файл напрямую в S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload  = () => xhr.status === 200 ? resolve() : reject(new Error(`HTTP ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Ошибка загрузки'))
        xhr.send(file)
      })

      setUploaded(file.name)
      onUpload(fileKey, file.name)

    } catch (err: any) {
      setError(err.message ?? 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {/* Зона перетаскивания */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '10px', padding: '32px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s',
          background: dragging ? 'rgba(41,82,200,0.05)' : 'transparent',
        }}
      >
        <input
          ref={inputRef} type="file" accept=".rfa"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {uploaded ? (
          <>
            <i className="ti ti-circle-check" style={{ fontSize: '32px', color: '#1D9E75', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600 }}>Загружено: {uploaded}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Нажмите чтобы заменить файл</div>
          </>
        ) : uploading ? (
          <>
            <i className="ti ti-loader" style={{ fontSize: '28px', color: 'var(--accent)', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '10px' }}>Загружаем... {progress}%</div>
            <div style={{ background: 'var(--bg3)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
            </div>
          </>
        ) : (
          <>
            <i className="ti ti-upload" style={{ fontSize: '28px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Перетащите RFA файл сюда</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>или нажмите для выбора · Максимум 50 МБ</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--danger)', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
