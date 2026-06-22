// src/hooks/useReviewCommentsCount.ts
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useReviewCommentsCount() {
  const { data, isLoading } = useSWR('/api/admin/review-comments/count', fetcher, {
    refreshInterval: 30_000,
  })
  return { count: data?.count ?? 0, isLoading }
}
