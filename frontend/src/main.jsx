import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/shared/ErrorBoundary'
import LoadingSkeleton from './components/shared/LoadingSkeleton'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingSkeleton />}>
          <App />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
