'use client'
// src/components/admin/AdminSWRProvider.tsx
import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/fetcher'

export default function AdminSWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,   // обновлять при возврате в окно
        refreshInterval: 60000,    // фолбэк-поллинг раз в минуту
      }}
    >
      {children}
    </SWRConfig>
  )
}
