import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuthStore } from '../stores/authStore'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

function setAuthState(partial) {
  useAuthStore.setState({ user: null, token: null, isLoading: false, ...partial })
}

describe('Navbar', () => {
  beforeEach(() => {
    setAuthState({})
  })

  it('shows login and get started for guests', () => {
    renderNavbar()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('shows user info and logout when authenticated', () => {
    setAuthState({ user: { full_name: 'Test User', role: 'user' }, token: 't' })
    renderNavbar()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('shows admin link for admin users', () => {
    setAuthState({ user: { full_name: 'Super U', role: 'admin' }, token: 't' })
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  })

  it('hides admin link for regular users', () => {
    setAuthState({ user: { full_name: 'User', role: 'user' }, token: 't' })
    renderNavbar()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('renders brand logo and name', () => {
    renderNavbar()
    expect(screen.getByText('Path')).toBeInTheDocument()
    expect(screen.getByText('Forge')).toBeInTheDocument()
  })
})
