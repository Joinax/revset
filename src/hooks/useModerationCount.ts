// src/hooks/useModerationCount.ts
import useSWR from 'swr'

export const MODERATION_COUNT_KEY = '/api/admin/moderation-count'

export function useModerationCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(MODERATION_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
