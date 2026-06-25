'use client'

import { useState, useRef } from 'react'

type Props = {
  onUpload: (fileKey: string, fileName: string) => void
  onClear?: () => void
}

export default function PdfUpload({ onUpload, onClear }: Props) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')
  const [uploaded,  setUploaded]  = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf') {
      setError('Разрешены только файлы формата .pdf')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('PDF не должен превышать 50 МБ')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      const res = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName:   file.name,
          fileType:   'application/pdf',
          fileSize:   file.size,
          uploadType: 'pdf',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Ошибка получения URL')
      }

      const { uploadUrl, fileKey } = await res.json()

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', 'application/pdf')
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload  = () => xhr.status === 200 ? resolve() : reject(new Error(`HTTP ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Ошибка загрузки'))
        xhr.send(file)
      })

      setUploaded(file.name)
      onUpload(fileKey, file.name)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  function handleClear() {
    setUploaded(null)
    setError('')
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  return (
    <div>
      <div
        onClick={() => !uploaded && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          border:       `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '10px',
          padding:      '24px',
          textAlign:    'center',
          cursor:       uploaded ? 'default' : 'pointer',
          transition:   'border-color 0.2s',
          background:   dragging ? 'rgba(41,82,200,0.05)' : 'transparent',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {uploaded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: '24px', color: '#E24B4A' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{uploaded}</div>
              <button type="button" onClick={handleClear} style={{ fontSize: '12px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                Удалить
              </button>
            </div>
          </div>
        ) : uploading ? (
          <>
            <i className="ti ti-loader" style={{ fontSize: '24px', color: 'var(--accent)', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>Загружаем... {progress}%</div>
            <div style={{ background: 'var(--bg3)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
            </div>
          </>
        ) : (
          <>
            <i className="ti ti-file-type-pdf" style={{ fontSize: '24px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Перетащите PDF сюда</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>или нажмите для выбора · до 50 МБ</div>
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
