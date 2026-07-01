type Cap = 'moderate' | 'support' | 'sell'
type U = { role: string; isBanned: boolean; isModerator?: boolean; isSupport?: boolean }

export function can(user: U | null | undefined, cap: Cap): boolean {
  if (!user || user.isBanned) return false
  if (user.role === 'admin') return true
  switch (cap) {
    case 'moderate': return !!user.isModerator
    case 'support':  return !!user.isSupport
    case 'sell':     return user.role === 'author'
  }
}
