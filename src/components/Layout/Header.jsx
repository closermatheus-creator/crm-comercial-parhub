import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import { Moon, Sun, LogOut, Search, User, Building2 } from 'lucide-react'

export default function Header() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [showBusca, setShowBusca] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados([])
      return
    }

    const timer = setTimeout(async () => {
      if (!user?.equipeId) return
      const { data } = await supabase
        .from('contatos')
        .select('id, nome, telefone, empresa, status')
        .eq('equipe_id', user.equipeId)
        .or(`nome.ilike.%${busca}%,empresa.ilike.%${busca}%,telefone.ilike.%${busca}%`)
        .limit(5)
        .order('nome')
      setResultados(data || [])
    }, 300)

    return () => clearTimeout(timer)
  }, [busca, user?.equipeId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowBusca(true)
      }
      if (e.key === 'Escape') {
        setShowBusca(false)
        setBusca('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowBusca(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-20">
      <div className="relative flex-1 max-w-md" ref={dropdownRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar contatos... (Ctrl+K)"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setShowBusca(true) }}
            onFocus={() => setShowBusca(true)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          {busca && (
            <button
              onClick={() => { setBusca(''); setResultados([]) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {showBusca && busca.trim().length >= 2 && (
          <div className="absolute top-full mt-2 w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50">
            {resultados.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                Nenhum contato encontrado
              </div>
            ) : (
              resultados.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    navigate('/contatos')
                    setShowBusca(false)
                    setBusca('')
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <User size={14} className="text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">{c.nome}</p>
                    {c.empresa && (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        <Building2 size={10} /> {c.empresa}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
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