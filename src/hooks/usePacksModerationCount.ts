import useSWR from 'swr'

export const PACKS_MODERATION_COUNT_KEY = '/api/admin/packs/count'

export function usePacksModerationCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(PACKS_MODERATION_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
