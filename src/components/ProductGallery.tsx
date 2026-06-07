// src/components/ProductGallery.tsx
'use client'

import { useState, useEffect } from 'react'

type Props = {
  images:      string[]
  productName: string
  emoji:       string
  previewBg:   string
  s3Endpoint:  string
  s3Bucket:    string
}

export default function ProductGallery({
  images, productName, emoji, previewBg, s3Endpoint, s3Bucket,
}: Props) {
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [lightboxOpen,  setLightboxOpen]  = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  function getImageUrl(fileKey: string) {
    return `${s3Endpoint}/${s3Bucket}/${fileKey}`
  }

  useEffect(() => {
    if (!lightboxOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     setLightboxOpen(false)
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % images.length)
      if (e.key === 'ArrowLeft')  setLightboxIndex(i => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, images.length])

  if (!images || images.length === 0) {
    return (
      <div style={{ background: previewBg, borderRadius: '14px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '90px', marginBottom: '12px', border: '1px solid var(--border)', width: '100%' }}>
        {emoji}
      </div>
    )
  }

  return (
    <>
      {/* Главное изображение со стрелками */}
      <div
        onClick={() => { setLightboxIndex(activeIndex); setLightboxOpen(true) }}
        style={{ borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '12px', border: '1px solid var(--border)', background: previewBg, position: 'relative', width: '100%', cursor: 'zoom-in' }}
      >
        <img
          src={getImageUrl(images[activeIndex])}
          alt={`${productName} — фото ${activeIndex + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />

        {/* Стрелка влево */}
        {images.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); setActiveIndex(i => (i - 1 + images.length) % images.length) }}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            ‹
          </button>
        )}

        {/* Стрелка вправо */}
        {images.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); setActiveIndex(i => (i + 1) % images.length) }}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            ›
          </button>
        )}

        {/* Счётчик */}
        {images.length > 1 && (
          <span style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>
            {activeIndex + 1} / {images.length}
          </span>
        )}

        {/* Иконка увеличения */}
        <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.4)', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-arrows-maximize" style={{ fontSize: '16px' }} />
        </span>
      </div>

      {/* Миниатюры — без стрелок */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
          {images.map((key, i) => (
            <button key={key} onClick={() => setActiveIndex(i)}
              style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer', outline: activeIndex === i ? '2px solid var(--accent)' : '1px solid var(--border)', outlineOffset: '2px' }}>
              <img src={getImageUrl(key)} alt={`фото ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Лайтбокс */}
      {lightboxOpen && (
        <div onClick={() => setLightboxOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={getImageUrl(images[lightboxIndex])}
            alt={`${productName} — фото ${lightboxIndex + 1}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />
          <button onClick={() => setLightboxOpen(false)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length) }}
                style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ‹
              </button>
              <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length) }}
                style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ›
              </button>
              <span style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '13px', padding: '4px 12px', borderRadius: '20px' }}>
                {lightboxIndex + 1} / {images.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}
