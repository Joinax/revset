// src/hooks/useIdeasModerationCount.ts
import useSWR from 'swr'

export const IDEAS_COUNT_KEY = '/api/admin/ideas/count'

export function useIdeasModerationCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(IDEAS_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
