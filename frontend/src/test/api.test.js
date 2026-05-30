import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api'

const mockJson = vi.fn()
const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  localStorage.clear()
  mockJson.mockReset()
  mockFetch.mockReset()
})

function mockResponse(status, body) {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: mockJson.mockResolvedValue(body),
  })
}

describe('apiGet', () => {
  it('sends GET without token when not logged in', async () => {
    mockResponse(200, { data: 'ok' })
    const result = await apiGet('/test')
    expect(mockFetch).toHaveBeenCalledWith('/api/test', { headers: {} })
    expect(result).toEqual({ data: 'ok' })
  })

  it('sends GET with token when logged in', async () => {
    localStorage.setItem('token', 'my-token')
    mockResponse(200, { data: 'ok' })
    await apiGet('/test')
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: { Authorization: 'Bearer my-token' },
    })
  })

  it('returns null on 204', async () => {
    mockResponse(204, null)
    mockJson.mockRejectedValue(new Error('should not be called'))
    const result = await apiGet('/test')
    expect(result).toBeNull()
  })

  it('redirects on 401', async () => {
    localStorage.setItem('token', 'bad')
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { set href(v) { hrefSetter(v) } },
      writable: true,
    })
    mockResponse(401, { detail: 'Unauthorized' })
    await expect(apiGet('/test')).rejects.toThrow('Session expired')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('throws on non-ok response', async () => {
    mockResponse(400, { detail: 'Bad request' })
    await expect(apiGet('/test')).rejects.toThrow('Bad request')
  })
})

describe('apiPost', () => {
  it('sends POST with JSON body', async () => {
    mockResponse(201, { id: 1 })
    const result = await apiPost('/create', { name: 'test' })
    expect(mockFetch).toHaveBeenCalledWith('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    })
    expect(result).toEqual({ id: 1 })
  })

  it('sends POST with token', async () => {
    localStorage.setItem('token', 't')
    mockResponse(201, {})
    await apiPost('/create', {})
    expect(mockFetch).toHaveBeenCalledWith('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      body: JSON.stringify({}),
    })
  })
})

describe('apiPatch', () => {
  it('sends PATCH with body', async () => {
    mockResponse(200, { updated: true })
    const result = await apiPatch('/item/1', { name: 'new' })
    expect(mockFetch).toHaveBeenCalledWith('/api/item/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new' }),
    })
    expect(result).toEqual({ updated: true })
  })

  it('sends PATCH without body', async () => {
    mockResponse(200, {})
    await apiPatch('/item/1', null)
    const call = mockFetch.mock.calls[0][1]
    expect(call.body).toBeUndefined()
  })
})

describe('apiDelete', () => {
  it('sends DELETE', async () => {
    mockResponse(204, null)
    mockJson.mockRejectedValue(new Error('no json'))
    const result = await apiDelete('/item/1')
    expect(mockFetch).toHaveBeenCalledWith('/api/item/1', {
      method: 'DELETE',
      headers: {},
    })
    expect(result).toBeNull()
  })
})
