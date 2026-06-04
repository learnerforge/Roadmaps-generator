import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import useSocialAuth from '../hooks/useSocialAuth'
import GoogleIcon from '../components/icons/GoogleIcon'
import GitHubIcon from '../components/icons/GitHubIcon'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { error, setError, socialLoading, handleSocialLogin } = useSocialAuth('/dashboard')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiPost('/auth/register', {
        full_name: fullName,
        email,
        password,
      })
      login(result.access_token, result.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-text-2">Start your learning journey today</p>
        </div>

        <div className="mb-6 space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            {socialLoading === 'google' ? 'Connecting...' : 'Sign up with Google'}
          </button>
          <button
            onClick={() => handleSocialLogin('github')}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <GitHubIcon />
            {socialLoading === 'github' ? 'Connecting...' : 'Sign up with GitHub'}
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
            <label className="mb-1 block text-xs text-text-3">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
              required
            />
          </div>
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
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-3">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
