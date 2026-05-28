import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Moon, Sun, LogOut } from 'lucide-react'

export default function Header() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-20">
      <div>
        <h2 className="text-sm text-[var(--text-secondary)]">Bem-vindo</h2>
        <p className="text-[var(--text-primary)] font-medium">{user?.nome || 'Usuário'}</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {user?.foto && (
          <img src={user.foto} alt="" className="w-8 h-8 rounded-full border-2 border-[var(--border-color)]" />
        )}
        <button onClick={logout} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--text-secondary)] hover:text-red-500">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}