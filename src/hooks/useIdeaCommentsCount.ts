// src/hooks/useIdeaCommentsCount.ts
import useSWR from 'swr'

export const IDEA_COMMENTS_COUNT_KEY = '/api/admin/ideas/comments/count'

export function useIdeaCommentsCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(IDEA_COMMENTS_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
