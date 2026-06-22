// src/hooks/useReviewsCount.ts
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useReviewsCount() {
  const { data, isLoading } = useSWR('/api/admin/reviews/count', fetcher, {
    refreshInterval: 30_000,
  })
  return { count: data?.count ?? 0, isLoading }
}
