import { useState, useCallback, useRef, useEffect } from 'react'

let toastId = 0

export default function useToast() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        delete timersRef.current[id]
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
      timersRef.current = {}
    }
  }, [])

  return { toasts, addToast, removeToast }
}
