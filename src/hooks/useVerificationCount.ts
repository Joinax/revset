// src/hooks/useVerificationCount.ts
import useSWR from 'swr'

export const VERIFICATION_COUNT_KEY = '/api/admin/verification-count'

export function useVerificationCount() {
  const { data, mutate, isLoading } = useSWR<{ count: number }>(VERIFICATION_COUNT_KEY)
  return { count: data?.count ?? 0, isLoading, mutate }
}
