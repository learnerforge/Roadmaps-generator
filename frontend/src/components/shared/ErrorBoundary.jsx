import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold text-white">Something went wrong</h2>
            <p className="mb-4 text-sm text-text-2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-2 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
