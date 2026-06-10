// src/components/AuthorSubscribeButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  authorId:    string
  isFollowing: boolean
}

export default function AuthorSubscribeButton({ authorId, isFollowing }: Props) {
  const [following, setFollowing] = useState(isFollowing)
  const [loading,   setLoading]   = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/follow', {
      method:  following ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ authorId }),
    })
    setLoading(false)
    if (res.status === 401) { router.push('/login'); return }
    if (res.ok) setFollowing(f => !f)
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading} className={`sub-btn ${following ? 'sub-active' : 'sub-default'}`}>
        <i className={`ti ${loading ? 'ti-loader-2 spin' : following ? 'ti-check' : 'ti-bell-plus'}`} />
        <span>{loading ? '...' : following ? 'Вы подписаны' : 'Подписаться'}</span>
      </button>

      <style>{`
        .sub-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 12px;
          font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: transform 0.18s, box-shadow 0.18s;
          border: none;
        }
        .sub-btn i { font-size: 16px; }

        /* Не подписан — яркая синяя */
        .sub-btn.sub-default {
          background: var(--accent);
          color: #fff;
          box-shadow: 0 4px 20px rgba(41,82,200,0.5);
        }
        .sub-btn.sub-default:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(41,82,200,0.6);
        }

        /* Подписан — зелёная обводка */
        .sub-btn.sub-active {
          background: transparent;
          color: #1D9E75;
          border: 1.5px solid #1D9E75 !important;
        }
        .sub-btn.sub-active:hover {
          background: rgba(29,158,117,0.1);
          transform: translateY(-1px);
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
      `}</style>
    </>
  )
}
