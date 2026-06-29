'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'

export function useAdminEvents() {
  const router = useRouter()

  useEffect(() => {
    const es = new EventSource('/api/admin/events')

    es.onmessage = () => {
      router.refresh()
      // Инвалидируем все SWR-кеши (бейджи в сайдбаре)
      mutate(() => true, undefined, { revalidate: true })
    }

    // EventSource автоматически переподключается при разрыве
    return () => es.close()
  }, [router])
}
