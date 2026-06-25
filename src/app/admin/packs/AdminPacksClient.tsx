'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'

const S3  = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000'
const BKT = process.env.NEXT_PUBLIC_S3_BUCKET   ?? 'revset'

type Pack = {
  id: string; name: string; price: number; moderationStatus: string
  createdAt: string; authorName: string | null; authorEmail: string
  categoryName: string; productsCount: number; coverKey: string | null
}

export default function AdminPacksClient({ packs, pendingCount, currentStatus }: {
  packs: Pack[]; pendingCount: number; currentStatus: string
}) {
  const router  = useRouter()
  const path    = usePathname()
  const [isPending, start] = useTransition()

  const TABS = [
    { value: 'PENDING',  label: 'На модерации', count: pendingCount },
    { value: 'APPROVED', label: 'Одобрены',     count: null },
    { value: 'REJECTED', label: 'Отклонены',    count: null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Модерация паков</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>Проверка паков авторов</p>
      </div>

      <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg2)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab.value}
              onClick={() => start(() => router.push(`${path}?status=${tab.value}`))}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer',
                fontWeight: currentStatus === tab.value ? 700 : 400,
                background: currentStatus === tab.value ? 'var(--admin-bg)' : 'transparent',
                color: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-muted)',
              }}>
              {tab.label}
              {tab.count != null && (
                <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: currentStatus === tab.value ? 'var(--admin-accent)' : 'var(--admin-border)', color: currentStatus === tab.value ? '#fff' : 'var(--admin-muted)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {packs.length === 0 ? (
        <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
          Нет паков в этом статусе
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: isPending ? 0.6 : 1 }}>
          {packs.map(pack => (
            <Link key={pack.id} href={`/admin/packs/${pack.id}`} style={{
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderRadius: '14px', padding: '18px 20px', textDecoration: 'none', color: 'inherit',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{ width: '56px', height: '46px', borderRadius: '10px', background: 'var(--admin-bg2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pack.coverKey
                  ? <img src={`${S3}/${BKT}/${pack.coverKey}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <i className="ti ti-package" style={{ fontSize: '20px', color: 'var(--admin-muted)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '4px' }}>{pack.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                  {pack.authorName} · {pack.categoryName} · {pack.productsCount} моделей · {pack.price.toLocaleString('ru')} ₽
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-muted)' }}>
                {new Date(pack.createdAt).toLocaleDateString('ru')}
              </div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--admin-muted)', fontSize: '16px' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
