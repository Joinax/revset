// src/hooks/useSupportCount.ts
import useSWR from 'swr'

export const SUPPORT_COUNT_KEY = '/api/admin/support/count'

export function useSupportCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(SUPPORT_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
