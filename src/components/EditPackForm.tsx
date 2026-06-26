'use client'

import { useState, useEffect, useRef } from 'react'
import ImageUpload from './ImageUpload'
import FileUpload from './FileUpload'
import PdfUpload from './PdfUpload'
import ProductPickerModal, { type PickerProduct } from './ProductPickerModal'

const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const S3_BUCKET   = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Props = {
  packId:           string
  categories:       { id: string; name: string }[]
  approvedProducts: PickerProduct[]
  onSuccess:        () => void
  onCancel:         () => void
}

export default function EditPackForm({ packId, categories, approvedProducts, onSuccess, onCancel }: Props) {
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError,   setFetchError]   = useState('')

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [price,       setPrice]       = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickerOpen,  setPickerOpen]  = useState(false)

  // Существующие доп-изображения (не авто из карточек)
  const [existingImages,  setExistingImages]  = useState<string[]>([])
  const [keepImageKeys,   setKeepImageKeys]   = useState<Set<string>>(new Set())
  const [newExtraImages,  setNewExtraImages]  = useState<{ fileKey: string; url: string; name: string }[]>([])

  // Файлы
  const [existingAssembly, setExistingAssembly] = useState<string | null>(null)
  const [newAssemblyKey,   setNewAssemblyKey]   = useState('')
  const [clearAssembly,    setClearAssembly]    = useState(false)
  const [existingPdf,      setExistingPdf]      = useState<string | null>(null)
  const [newPdfKey,        setNewPdfKey]        = useState('')
  const [clearPdf,         setClearPdf]         = useState(false)

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Авто-фото из выбранных карточек — порядок selectedIds определяет обложку
  const autoImages = selectedIds
    .map(id => approvedProducts.find(p => p.id === id))
    .filter((p): p is PickerProduct => !!p && p.images.length > 0)
    .map(p => ({ productId: p.id, fileKey: p.images[0], url: `${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`, name: p.name }))

  const autoImageKeySet = new Set(autoImages.map(i => i.fileKey))
  const recentProducts  = approvedProducts.slice(0, 10)

  // Сохранённые доп-фото (не авто)
  const existingExtraImages = existingImages.filter(k => !autoImageKeySet.has(k))

  // Drag-and-drop для переупорядочивания авто-фото
  const dragIdxRef = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function handlePhotoDragStart(i: number) {
    dragIdxRef.current = i
  }
  function handlePhotoDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    setDragOverIdx(i)
    if (dragIdxRef.current === null || dragIdxRef.current === i) return
    const newIds = [...selectedIds]
    const [movedId] = newIds.splice(dragIdxRef.current, 1)
    newIds.splice(i, 0, movedId)
    dragIdxRef.current = i
    setSelectedIds(newIds)
  }
  function handlePhotoDragEnd() {
    dragIdxRef.current = null
    setDragOverIdx(null)
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/packs/${packId}`)
        if (!res.ok) throw new Error('load failed')
        const pack = await res.json()

        setName(pack.name ?? '')
        setDescription(pack.description ?? '')
        setPrice(pack.price > 0 ? String(pack.price) : '')
        setCategoryId(pack.categoryId ?? '')
        setSelectedIds((pack.products ?? []).map((pp: { productId: string }) => pp.productId))

        const imgKeys: string[] = (pack.images ?? []).map((i: { key: string }) => i.key)
        setExistingImages(imgKeys)
        setKeepImageKeys(new Set(imgKeys))

        setExistingAssembly(pack.assemblyFileKey ?? null)
        setExistingPdf(pack.pdfKey ?? null)
      } catch {
        setFetchError('Не удалось загрузить данные пака')
      } finally {
        setFetchLoading(false)
      }
    }
    load()
  }, [packId])

  function toggleProduct(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleKeepImage(key: string) {
    setKeepImageKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim())            { setError('Укажите название пака'); return }
    if (selectedIds.length < 2)  { setError('Выберите минимум 2 карточки'); return }
    if (selectedIds.length > 12) { setError('Максимум 12 карточек'); return }
    if (!categoryId)             { setError('Выберите категорию'); return }

    const priceNum = price ? parseFloat(price) : 0
    if (priceNum !== 0 && (priceNum < 200 || priceNum > 350000)) {
      setError('Цена должна быть 0 (бесплатно) или от 200 до 350 000 ₽')
      return
    }

    const finalKeepImageKeys = [...keepImageKeys].filter(k => !autoImageKeySet.has(k))

    setSaving(true)
    try {
      const res = await fetch(`/api/packs/${packId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             name.trim(),
          description:      description.trim() || null,
          price:            priceNum,
          categoryId,
          productIds:       selectedIds,
          productImageKeys: autoImages.map(i => i.fileKey),
          keepImageKeys:    finalKeepImageKeys,
          newImageKeys:     newExtraImages.map(i => i.fileKey),
          assemblyFileKey:  clearAssembly ? null : (newAssemblyKey || undefined),
          pdfKey:           clearPdf      ? null : (newPdfKey      || undefined),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Ошибка сохранения'); return }

      setSuccess(true)
      setTimeout(onSuccess, 1200)
    } catch {
      setError('Ошибка соединения')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }

  if (fetchLoading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
      <i className="ti ti-loader" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }} />
      Загрузка...
    </div>
  )

  if (fetchError) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{fetchError}</div>
  )

  if (success) return (
    <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <i className="ti ti-circle-check" style={{ fontSize: '48px', color: '#1D9E75', display: 'block', marginBottom: '12px' }} />
      <div style={{ fontSize: '16px', fontWeight: 600 }}>Пак сохранён</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'grid', gap: '20px' }}>

      {/* Название */}
      <div>
        <label style={labelStyle}>Название пака *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>

      {/* Описание */}
      <div>
        <label style={labelStyle}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Карточки * — выбрано {selectedIds.length} / 12
            <span style={{ fontWeight: 400 }}> (от 2 до 12)</span>
          </label>
          {approvedProducts.length > 0 && (
            <button type="button" onClick={() => setPickerOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
              <i className="ti ti-search" style={{ fontSize: '13px' }} />
              Найти ещё
            </button>
          )}
        </div>

        {/* Выбранные карточки */}
        {selectedIds.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Выбрано:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedIds.map(id => {
                const p = approvedProducts.find(x => x.id === id)
                if (!p) return null
                return (
                  <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--accent)', background: 'var(--bg3)' }}>
                      {p.images[0]
                        ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-3d" style={{ fontSize: '16px', color: 'var(--muted)' }} /></div>}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '3px', width: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{p.name}</div>
                    <button type="button" onClick={() => toggleProduct(id)}
                      style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--danger)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <i className="ti ti-x" style={{ fontSize: '9px', color: '#fff' }} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Последние 10 карточек */}
        {approvedProducts.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
            Нет одобренных моделей
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Последние добавленные:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentProducts.map(p => {
                const selected = selectedIds.includes(p.id)
                const disabled = !selected && selectedIds.length >= 12
                return (
                  <div key={p.id} onClick={() => !disabled && toggleProduct(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer', border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'rgba(72,128,255,0.07)' : 'var(--bg)', opacity: disabled ? 0.4 : 1, transition: 'background 0.15s, border-color 0.15s' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                      {p.images[0]
                        ? <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-3d" style={{ fontSize: '16px', color: 'var(--muted)' }} /></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.price ? `${Number(p.price).toLocaleString('ru')} ₽` : 'Бесплатно'}</div>
                    </div>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selected && <i className="ti ti-check" style={{ fontSize: '11px', color: '#fff' }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <ProductPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          products={approvedProducts}
          selectedIds={selectedIds}
          onConfirm={ids => setSelectedIds(ids)}
        />
      </div>

      {/* Фотографии пака */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Обложка и фотографии пака</label>
          {autoImages.length > 0 ? (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                Первое фото — обложка пака. Перетащите фото чтобы изменить порядок:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {autoImages.map((img, i) => {
                  const isCover = i === 0
                  const isDragTarget = dragOverIdx === i && dragIdxRef.current !== null && dragIdxRef.current !== i
                  return (
                    <div
                      key={img.productId}
                      draggable
                      onDragStart={() => handlePhotoDragStart(i)}
                      onDragOver={e => handlePhotoDragOver(e, i)}
                      onDragEnd={handlePhotoDragEnd}
                      title={isCover ? 'Обложка пака' : 'Перетащите чтобы сделать обложкой'}
                      style={{ position: 'relative', width: '80px', cursor: 'grab', flexShrink: 0, opacity: isDragTarget ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${isCover ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg3)' }}>
                        <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      </div>
                      {isCover && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent)', fontSize: '9px', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '3px 0', borderRadius: '0 0 8px 8px', letterSpacing: '0.03em' }}>
                          ОБЛОЖКА
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              Выберите карточки выше — фото первой карточки станет обложкой пака
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>
            Дополнительные фото в галерею <span style={{ fontWeight: 400 }}>(необязательно, до 6 штук)</span>
          </label>

          {existingExtraImages.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Текущие фото (нажмите чтобы убрать):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {existingExtraImages.map(key => {
                  const kept = keepImageKeys.has(key)
                  return (
                    <div key={key} onClick={() => toggleKeepImage(key)} style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${kept ? 'var(--border)' : 'var(--danger)'}`, position: 'relative', cursor: 'pointer', opacity: kept ? 1 : 0.4 }}>
                      <img src={`${S3_ENDPOINT}/${S3_BUCKET}/${key}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {!kept && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}><i className="ti ti-x" style={{ color: '#fff', fontSize: '18px' }} /></div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <ImageUpload onImagesChange={imgs => setNewExtraImages(imgs)} />
        </div>
      </div>

      {/* Файлы */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Сборный RVT/RFA файл</label>
          {existingAssembly && !clearAssembly ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <i className="ti ti-file" style={{ fontSize: '18px', color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', flex: 1 }}>RVT файл загружен</span>
              <button type="button" onClick={() => setClearAssembly(true)} style={{ fontSize: '12px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Удалить</button>
            </div>
          ) : (
            <FileUpload onUpload={key => { setNewAssemblyKey(key); setClearAssembly(false) }} />
          )}
        </div>

        <div>
          <label style={labelStyle}>PDF-инструкция</label>
          {existingPdf && !clearPdf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <i className="ti ti-file-type-pdf" style={{ fontSize: '20px', color: '#E24B4A' }} />
              <span style={{ fontSize: '13px', flex: 1 }}>PDF загружен</span>
              <button type="button" onClick={() => setClearPdf(true)} style={{ fontSize: '12px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Удалить</button>
            </div>
          ) : (
            <PdfUpload onUpload={key => { setNewPdfKey(key); setClearPdf(false) }} onClear={() => setNewPdfKey('')} />
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}>
          Отмена
        </button>
        <button type="submit" disabled={saving || selectedIds.length < 2}
          style={{ padding: '13px', borderRadius: '10px', border: 'none', background: saving || selectedIds.length < 2 ? 'var(--bg3)' : 'var(--accent)', color: '#fff', fontSize: '13px', fontFamily: 'var(--font-unbounded), sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>
      </div>

    </form>
  )
}
