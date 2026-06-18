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

  if (!isFree && !isPurchased) return null

  async function handleDownload() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/download/${productId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка скачивания'); return }
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%',
          background: loading ? 'var(--bg3)' : 'var(--accent)',
          color: '#fff', border: 'none', borderRadius: '11px',
          padding: '13px',
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: '13px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity .15s',
        }}
        className="download-btn"
      >
        <i className="ti ti-download" style={{ fontSize: '16px' }} />
        {loading ? 'Подготавливаем...' : 'Скачать RFA'}
      </button>
      {error && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--danger)', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
          {error}
        </div>
      )}
      <style>{`
        .download-btn { transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; }
        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(72,128,255,0.35);
          opacity: 0.96;
        }
        .download-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  )
}
