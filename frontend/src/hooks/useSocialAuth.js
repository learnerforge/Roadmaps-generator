import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

function generateState() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function useSocialAuth(redirectPath = '/dashboard') {
  const [error, setError] = useState('')
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
          navigate(redirectPath, { replace: true })
        })
        .catch((err) => {
          setError(err.message || 'GitHub login failed')
          setSocialLoading(null)
        })
    }
  }, [])

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
                navigate(redirectPath)
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
        const redirectUri = `${window.location.origin}${window.location.pathname}`
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=read:user,user:email`
        window.location.href = githubUrl
      }
    } catch (err) {
      setError(err.message || `${provider} login failed`)
    } finally {
      setSocialLoading(null)
    }
  }

  return { error, setError, socialLoading, handleSocialLogin }
}
