export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const API_TIMEOUT = 15000
const RETRY_DELAYS = [0, 1000, 3000]

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${returnUrl}`
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.status === 204 ? null : res.json()
}

function combineSignals(...signals) {
  const clean = signals.filter(Boolean)
  if (clean.length === 0) return undefined
  if (clean.length === 1) return clean[0]
  return typeof AbortSignal.any === 'function'
    ? AbortSignal.any(clean)
    : clean[0]
}

async function fetchWithRetry(url, options, retries = 2) {
  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT)
  const signal = combineSignals(options?.signal, timeoutSignal)

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal })
      return res
    } catch (err) {
      if (i === retries) throw err
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[i] || 1000))
    }
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet(path, { signal } = {}) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    headers: authHeaders(),
    signal,
  })
  return handleResponse(res)
}

export async function apiPost(path, body, { signal } = {}) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  })
  return handleResponse(res)
}

export async function apiPatch(path, body, { signal } = {}) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  return handleResponse(res)
}

export async function apiDownload(path, filename) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Download failed' }))
    throw new Error(err.detail || 'Download failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
