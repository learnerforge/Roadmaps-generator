import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="text-center max-w-sm animate-[fadeSlideUp_0.4s_ease-out]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-dim">
              <svg className="h-7 w-7 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-bold text-text">Something went wrong</h2>
            <p className="mb-1 text-sm text-text-2">An unexpected error occurred</p>
            <p className="mb-6 text-xs text-text-3 leading-relaxed max-w-xs mx-auto">
              {this.state.error?.message || 'Please try reloading the page.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary !px-5 !py-2"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-ghost !px-5 !py-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
