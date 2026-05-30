import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../stores/authStore'

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(),
}))

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null, isLoading: true })
  localStorage.clear()
})

describe('authStore', () => {
  it('login stores token in localStorage', () => {
    useAuthStore.getState().login('stored-token', { email: 'a@b.com' })
    expect(localStorage.getItem('token')).toBe('stored-token')
    expect(useAuthStore.getState().token).toBe('stored-token')
  })

  it('login sets token and user', () => {
    useAuthStore.getState().login('new-token', { email: 'a@b.com' })
    const state = useAuthStore.getState()
    expect(state.token).toBe('new-token')
    expect(state.user).toEqual({ email: 'a@b.com' })
    expect(localStorage.getItem('token')).toBe('new-token')
  })

  it('logout clears token and user', () => {
    useAuthStore.getState().login('t', { email: 'a@b.com' })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('updateUser merges partial updates', () => {
    useAuthStore.getState().login('t', { email: 'a@b.com', full_name: 'A' })
    useAuthStore.getState().updateUser({ full_name: 'B' })
    expect(useAuthStore.getState().user).toEqual({ email: 'a@b.com', full_name: 'B' })
  })

  it('init skips loading when no token', async () => {
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().isLoading).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('init loads user from token', async () => {
    const { apiGet } = await import('../lib/api')
    localStorage.setItem('token', 'valid-token')
    apiGet.mockResolvedValue({ email: 'u@test.com' })
    await useAuthStore.getState().init()
    const state = useAuthStore.getState()
    expect(state.user).toEqual({ email: 'u@test.com' })
    expect(state.isLoading).toBe(false)
  })

  it('init clears token on API failure', async () => {
    const { apiGet } = await import('../lib/api')
    localStorage.setItem('token', 'bad-token')
    apiGet.mockRejectedValue(new Error('Unauthorized'))
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
