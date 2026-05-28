import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            },
          }}
        />
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)