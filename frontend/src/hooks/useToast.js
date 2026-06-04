import { useState, useCallback } from 'react'

let toastId = 0

export default function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
