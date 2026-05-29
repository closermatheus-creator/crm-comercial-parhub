import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

function aplicarCorTema(corHex, isDark) {
  const root = document.documentElement
  
  if (corHex) {
    // Converter hex para RGB para usar no color-mix
    const r = parseInt(corHex.slice(1, 3), 16)
    const g = parseInt(corHex.slice(3, 5), 16)
    const b = parseInt(corHex.slice(5, 7), 16)
    
    // Escurecer para hover
    const hoverR = Math.max(0, r - 30)
    const hoverG = Math.max(0, g - 30)
    const hoverB = Math.max(0, b - 30)
    const corHover = `rgb(${hoverR}, ${hoverG}, ${hoverB})`
    
    root.style.setProperty('--brand-color', corHex)
    root.style.setProperty('--brand-color-hover', corHover)
    
    // Texto branco se cor escura, texto escuro se cor clara
    const luminosidade = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    root.style.setProperty('--brand-text', luminosidade > 0.6 ? '#1E2D53' : '#ffffff')
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const carregarEquipe = async (equipeId) => {
    if (!equipeId) return null
    const { data: eq } = await supabase
      .from('equipes')
      .select('*')
      .eq('id', equipeId)
      .single()
    
    if (eq?.cor_primaria) {
      aplicarCorTema(eq.cor_primaria)
    }
    
    return eq
  }

  const carregarUsuario = async (authUser) => {
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('equipe_id, role')
        .eq('id', authUser.id)
        .single()

      const equipe = await carregarEquipe(cliente?.equipe_id)

      setUser({
        uid: authUser.id,
        nome: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        foto: authUser.user_metadata?.avatar_url,
        equipeId: cliente?.equipe_id || null,
        role: cliente?.role || 'membro',
        equipe: equipe
      })
    } catch (err) {
      console.error('Erro ao carregar usuário:', err)
      setUser({
        uid: authUser.id,
        nome: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        foto: authUser.user_metadata?.avatar_url,
        equipeId: null,
        role: 'membro',
        equipe: null
      })
    } finally {
      setLoading(false)
    }
  }

  const recarregarEquipe = useCallback(async () => {
    if (!user?.equipeId) return
    const equipe = await carregarEquipe(user.equipeId)
    if (equipe) {
      setUser(prev => ({ ...prev, equipe }))
    }
  }, [user?.equipeId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        carregarUsuario(session.user)
      } else {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        carregarUsuario(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/overview'
      }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, recarregarEquipe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}