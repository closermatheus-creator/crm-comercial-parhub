import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const { isDark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="card p-8 w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: '#1E2D53' }}>
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PARHUB</h1>
          <p className="text-[var(--text-secondary)] text-sm">CRM Comercial</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-xs text-[var(--text-secondary)]">ACESSO</span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        <button onClick={login} className="w-full flex items-center justify-center gap-3 bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-primary)] font-medium py-3 px-4 rounded-lg transition-all border border-[var(--border-color)]">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  )
}
