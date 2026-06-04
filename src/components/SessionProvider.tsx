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
}

const SessionContext = createContext<SessionContextType>({
  user:    null,
  loading: true,
  refresh: () => {},
})

export function useAppSession() {
  return useContext(SessionContext)
}

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<SessionUser>(null)
  const [loading, setLoading] = useState(true)

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/get-session', {
        credentials: 'include',
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
    <SessionContext.Provider value={{ user, loading, refresh: fetchSession }}>
      {children}
    </SessionContext.Provider>
  )
}
