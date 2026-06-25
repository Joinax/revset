'use client'

import { useState } from 'react'
import ImageUpload from './ImageUpload'
import FileUpload from './FileUpload'
import PdfUpload from './PdfUpload'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Props = {
  categories:       { id: string; name: string }[]
  approvedProducts: { id: string; name: string; price: number | null; images: string[] }[]
  onSuccess:        () => void
}

export default function CreatePackForm({ categories, approvedProducts, onSuccess }: Props) {
  const [name,          setName]          = useState('')
  const [description,   setDescription]   = useState('')
  const [price,         setPrice]         = useState('')
  const [categoryId,    setCategoryId]    = useState(categories[0]?.id ?? '')
  const [selectedIds,   setSelectedIds]   = useState<string[]>([])
  const [hasExclusive,  setHasExclusive]  = useState(false)
  const [exclusiveDesc, setExclusiveDesc] = useState('')
  const [extraImages,   setExtraImages]   = useState<{ fileKey: string; url: string; name: string }[]>([])
  const [exclusiveImgKeys, setExclusiveImgKeys] = useState<{ fileKey: string; url: string; name: string }[]>([])

  // Главные фото выбранных карточек (images[0])
  const autoImages = selectedIds
    .map(id => approvedProducts.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ fileKey: p!.images[0], url: `${S3_ENDPOINT}/${S3_BUCKET}/${p!.images[0]}`, name: p!.name }))
  const [assemblyKey,   setAssemblyKey]   = useState('')
  const [pdfKey,        setPdfKey]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)

  function toggleProduct(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim())             { setError('Укажите название пака'); return }
    if (selectedIds.length < 2)   { setError('Выберите минимум 2 карточки'); return }
    if (selectedIds.length > 12)  { setError('Максимум 12 карточек'); return }
    if (!categoryId)              { setError('Выберите категорию'); return }

    const priceNum = price ? parseFloat(price) : 0
    if (priceNum !== 0 && (priceNum < 200 || priceNum > 350000)) {
      setError('Цена должна быть 0 (бесплатно) или от 200 до 350 000 ₽')
      return
    }

    if (hasExclusive && !assemblyKey) { setError('Для эксклюзива загрузите сборный RVT файл'); return }
    if (hasExclusive && !exclusiveDesc.trim()) { setError('Укажите описание эксклюзивного контента'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/packs/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:               name.trim(),
          description:        description.trim() || null,
          price:              priceNum,
          categoryId,
          productIds:         selectedIds,
          hasExclusive,
          exclusiveDesc:      hasExclusive ? exclusiveDesc.trim() : null,
          productImageKeys:   autoImages.map(i => i.fileKey),
          imageKeys:          extraImages.map(i => i.fileKey),
          exclusiveImageKeys: exclusiveImgKeys.map(i => i.fileKey),
          assemblyFileKey:    assemblyKey || null,
          pdfKey:             pdfKey || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка создания'); return }

      setSuccess(true)
      setTimeout(onSuccess, 1500)
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <i className="ti ti-circle-check" style={{ fontSize: '48px', color: '#1D9E75', display: 'block', marginBottom: '12px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Пак отправлен на проверку!</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Файлы проходят проверку безопасности.</div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px',
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'grid', gap: '20px' }}>

      <div style={{ fontSize: '15px', fontWeight: 700 }}>Новый пак</div>

      {/* Название */}
      <div>
        <label style={labelStyle}>Название пака *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Мебель для переговорной" style={inputStyle} />
      </div>

      {/* Описание */}
      <div>
        <label style={labelStyle}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder="Что входит в пак, особенности..."
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
      </div>

      {/* Категория + цена */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Категория *</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Цена (₽) — 0 = бесплатно</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min="0" style={inputStyle} />
        </div>
      </div>

      {/* Выбор карточек */}
      <div>
        <label style={labelStyle}>
          Карточки модели * — выбрано {selectedIds.length} из {approvedProducts.length}
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (от 2 до 12)</span>
        </label>
        {approvedProducts.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
            У вас нет одобренных моделей. Карточки должны пройти модерацию прежде чем их можно добавить в пак.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', padding: '4px' }}>
            {approvedProducts.map(p => {
              const selected = selectedIds.includes(p.id)
              return (
                <div key={p.id} onClick={() => toggleProduct(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'rgba(72,128,255,0.07)' : 'var(--bg)', transition: 'background 0.15s, border-color 0.15s' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                    {p.images[0]
                      ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-3d" style={{ fontSize: '16px', color: 'var(--muted)' }} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.price ? `${p.price.toLocaleString('ru')} ₽` : 'Бесплатно'}</div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected && <i className="ti ti-check" style={{ fontSize: '11px', color: '#fff' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Фотографии пака */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={labelStyle}>Фотографии пака</label>

        {/* Авто-изображения из выбранных карточек */}
        {autoImages.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
              Главные фото выбранных карточек ({autoImages.length} шт.) — добавляются автоматически:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {autoImages.map((img, i) => (
                <div key={img.fileKey + i} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {autoImages.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            Выберите карточки выше — их главные фото появятся здесь автоматически
          </div>
        )}

        {/* Дополнительные фото от автора */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
            Дополнительные фото (необязательно, до 6 штук):
          </div>
          <ImageUpload onImagesChange={(imgs) => setExtraImages(imgs)} />
        </div>
      </div>

      {/* PDF-инструкция */}
      <div>
        <label style={labelStyle}>PDF-инструкция <span style={{ fontWeight: 400 }}>(необязательно)</span></label>
        <PdfUpload onUpload={key => setPdfKey(key)} onClear={() => setPdfKey('')} />
      </div>

      {/* Эксклюзив */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setHasExclusive(v => !v)}>
          <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: hasExclusive ? 'var(--accent)' : 'var(--bg3)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: hasExclusive ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Эксклюзивный контент</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Сборный RVT файл + дополнительные превью только для покупателей</div>
          </div>
        </div>

        {hasExclusive && (
          <>
            <div>
              <label style={labelStyle}>Описание эксклюзива *</label>
              <textarea value={exclusiveDesc} onChange={e => setExclusiveDesc(e.target.value)} rows={2}
                placeholder="Что получит покупатель дополнительно..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-manrope)' }} />
            </div>
            <div>
              <label style={labelStyle}>Сборный RVT файл *</label>
              <FileUpload onUpload={key => setAssemblyKey(key)} />
            </div>
            <div>
              <label style={labelStyle}>Превью для покупателей <span style={{ fontWeight: 400 }}>(до 6 фото)</span></label>
              <ImageUpload onImagesChange={(imgs) => setExclusiveImgKeys(imgs)} />
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || selectedIds.length < 2}
        style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: loading || selectedIds.length < 2 ? 'var(--bg3)' : 'var(--accent)', color: '#fff', fontSize: '13px', fontFamily: 'var(--font-unbounded), sans-serif', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Отправляем...' : 'Отправить пак на модерацию'}
      </button>

    </form>
  )
}
