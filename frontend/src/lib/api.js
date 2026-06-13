export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const API_TIMEOUT = 15000
const RETRY_DELAYS = [1000, 3000]

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${returnUrl}`
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    const detail = err.detail
    const message = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join('; ')
      : typeof detail === 'object' ? JSON.stringify(detail)
      : 'Request failed'
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

function buildFetchOptions(options) {
  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT)
  const userSignal = options?.signal

  if (!userSignal) {
    return { ...options, signal: timeoutSignal }
  }

  if (typeof AbortSignal.any === 'function') {
    return { ...options, signal: AbortSignal.any([userSignal, timeoutSignal]) }
  }

  return { ...options, signal: userSignal }
}

async function fetchWithRetry(url, options, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const opts = buildFetchOptions(options)
    try {
      const res = await fetch(url, opts)
      return res
    } catch (err) {
      if (err.name === 'AbortError') throw err
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
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
  if (res.status === 401) {
    localStorage.removeItem('token')
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${returnUrl}`
    throw new Error('Session expired. Please log in again.')
  }
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
