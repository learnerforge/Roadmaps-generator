import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pathforge-theme'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return null
}

function resolveTheme() {
  return getStoredTheme() || getSystemTheme()
}

export function initTheme() {
  const theme = resolveTheme()
  document.documentElement.setAttribute('data-theme', theme)
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => resolveTheme())

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (!getStoredTheme()) {
        const next = mq.matches ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        setTheme(next)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    setTheme(next)
  }, [theme])

  return { theme, toggle, isDark: theme === 'dark' }
}
