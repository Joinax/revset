'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type SessionUser = {
  id:    string
  name:  string
  email: string
  image: string | null
  role:  string
} | null

type SessionContextType = {
  user:    SessionUser
  loading: boolean
  refresh: () => void
  updateUser: (patch: Partial<NonNullable<SessionUser>>) => void
}

const SessionContext = createContext<SessionContextType>({
  user:    null,
  loading: true,
  refresh: () => {},
  updateUser: () => {},
})

export function useAppSession() {
  return useContext(SessionContext)
}

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<SessionUser>(null)
  const [loading, setLoading] = useState(true)

  function updateUser(patch: Partial<NonNullable<SessionUser>>) {
    setUser(prev => prev ? { ...prev, ...patch } : prev)
  }

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/get-session', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data?.user ?? null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  return (
    <SessionContext.Provider value={{ user, loading, refresh: fetchSession, updateUser }}>
      {children}
    </SessionContext.Provider>
  )
}
