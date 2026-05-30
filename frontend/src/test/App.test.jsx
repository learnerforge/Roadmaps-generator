import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { useAuthStore } from '../stores/authStore'

vi.mock('../lib/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ total_users: 0, total_roadmaps: 0, published_roadmaps: 0, total_nodes: 0, open_feedback: 0 }),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  )
}

function setAuthState(partial) {
  useAuthStore.setState({ user: null, token: null, isLoading: false, ...partial })
}

describe('App routing', () => {
  beforeEach(() => {
    setAuthState({})
  })

  it('renders home page at /', () => {
    renderApp('/')
    expect(screen.getByText('Path')).toBeInTheDocument()
  })

  it('renders roadmaps page at /roadmaps', () => {
    renderApp('/roadmaps')
    expect(screen.getByText('Roadmaps')).toBeInTheDocument()
  })

  it('redirects to login for protected routes when guest', () => {
    renderApp('/dashboard')
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('redirects authenticated users away from login', () => {
    setAuthState({ user: { email: 'a@b.com', role: 'user' }, token: 't' })
    renderApp('/login')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders dashboard for authenticated users', () => {
    setAuthState({ user: { email: 'a@b.com', role: 'user' }, token: 't' })
    renderApp('/dashboard')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('blocks admin page for regular users', () => {
    setAuthState({ user: { email: 'a@b.com', role: 'user' }, token: 't' })
    renderApp('/admin')
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('allows admin access for admin users', async () => {
    setAuthState({ user: { email: 'admin@test.com', role: 'admin' }, token: 't' })
    renderApp('/admin')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin Panel' })).toBeInTheDocument()
    })
  })
})
