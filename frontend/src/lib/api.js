export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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

async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      if (i === retries) throw err
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet(path) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function apiPost(path, body) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function apiPatch(path, body) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(res)
}

export async function apiDelete(path) {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
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
