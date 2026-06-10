'use client'

import { useTheme } from './ThemeProvider'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ width: '32px', height: '32px' }} />

  const isDark = theme === 'dark'

  return (
    <button
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{
        width: '34px', height: '34px', borderRadius: '8px',
        border: '1px solid var(--border)', 
        background: 'var(--bg1)',
        color: 'var(--text)', 
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.2s, color 0.2s', flexShrink: 0,
      }}
      className="theme-toggle"
    >
      <i className={`ti ${isDark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: '16px' }} />
      <style>{`.theme-toggle:hover { border-color: var(--accent) !important; color: var(--accent) !important; }`}</style>
    </button>
  )
}
