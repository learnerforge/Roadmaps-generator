import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

function generateState() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const savedState = sessionStorage.getItem('oauth_state')
    sessionStorage.removeItem('oauth_state')

    if (code && state) {
      if (!savedState || state !== savedState) {
        setError('OAuth state mismatch. Please try again.')
        return
      }
      setSocialLoading('github')
      apiPost('/auth/social', { provider: 'github', token: code })
        .then((result) => {
          login(result.access_token, result.user)
          navigate('/dashboard', { replace: true })
        })
        .catch((err) => {
          setError(err.message || 'GitHub login failed')
          setSocialLoading(null)
        })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiPost('/auth/login', { email, password })
      login(result.access_token, result.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider) => {
    setError('')
    setSocialLoading(provider)
    try {
      const clientId = provider === 'google'
        ? import.meta.env.VITE_GOOGLE_CLIENT_ID
        : import.meta.env.VITE_GITHUB_CLIENT_ID
      if (!clientId) {
        setError(`${provider} login is not configured. Try email instead.`)
        setSocialLoading(null)
        return
      }
      if (provider === 'google') {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (response) => {
            if (response.access_token) {
              try {
                const result = await apiPost('/auth/social', { provider: 'google', token: response.access_token })
                login(result.access_token, result.user)
                navigate('/dashboard')
              } catch (err) {
                setError(err.message || 'Google login failed')
                setSocialLoading(null)
              }
            }
          },
        })
        client.requestAccessToken()
      } else {
        const state = generateState()
        sessionStorage.setItem('oauth_state', state)
        const redirectUri = `${window.location.origin}/login`
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=read:user,user:email`
        window.location.href = githubUrl
      }
    } catch (err) {
      setError(err.message || `${provider} login failed`)
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-text-2">Sign in to continue learning</p>
        </div>

        <div className="mb-6 space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </button>
          <button
            onClick={() => handleSocialLogin('github')}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            {socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-bg px-2 text-text-3">or</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red/20 bg-red-dim p-3 text-xs text-red">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-text-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-3">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-3">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
