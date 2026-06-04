// src/components/DownloadButton.tsx
'use client'

import { useState } from 'react'

type Props = {
  productId: string
  isFree:    boolean
  isPurchased: boolean
}

export default function DownloadButton({ productId, isFree, isPurchased }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Показываем кнопку только если товар бесплатный или куплен
  if (!isFree && !isPurchased) return null

  async function handleDownload() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/download/${productId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ошибка скачивания')
        return
      }

      // Открываем ссылку для скачивания
      window.open(data.downloadUrl, '_blank')

    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          display: 'block', width: '100%',
          background: loading ? 'var(--bg3)' : '#1D9E75',
          color: '#fff', border: 'none', borderRadius: '8px',
          padding: '13px',
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: '13px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
        }}
      >
        <i className="ti ti-download" style={{ marginRight: '8px' }} />
        {loading ? 'Подготавливаем файл...' : 'Скачать RFA'}
      </button>

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--danger)', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
