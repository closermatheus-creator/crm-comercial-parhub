import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function aplicarCorTema(corHex, isDark) {
  const root = document.documentElement
  const { r, g, b } = hexToRgb(corHex)
  
  // Cor principal (brand)
  root.style.setProperty('--brand-color', corHex)
  
  // Hover: versão um pouco mais escura
  const hoverR = Math.max(0, r - 25)
  const hoverG = Math.max(0, g - 25)
  const hoverB = Math.max(0, b - 25)
  root.style.setProperty('--brand-color-hover', rgbToHex(hoverR, hoverG, hoverB))
  
  // Texto sobre brand: branco ou escuro dependendo da luminosidade
  const luminosidade = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  root.style.setProperty('--brand-text', luminosidade > 0.6 ? '#1E2D53' : '#ffffff')
  
  // Tema escuro derivado da cor
  if (isDark) {
    // Fundo principal: cor bem escura (20% da cor original + 80% preto)
    const bgR = Math.round(r * 0.15)
    const bgG = Math.round(g * 0.15)
    const bgB = Math.round(b * 0.15)
    root.style.setProperty('--bg-primary', rgbToHex(bgR, bgG, bgB))
    
    // Fundo secundário: um pouco mais claro que o principal
    const secR = Math.round(r * 0.22)
    const secG = Math.round(g * 0.22)
    const secB = Math.round(b * 0.22)
    root.style.setProperty('--bg-secondary', rgbToHex(secR, secG, secB))
    
    // Fundo terciário: tom médio
    const terR = Math.round(r * 0.30)
    const terG = Math.round(g * 0.30)
    const terB = Math.round(b * 0.30)
    root.style.setProperty('--bg-tertiary', rgbToHex(terR, terG, terB))
    
    // Texto: claro
    root.style.setProperty('--text-primary', '#FBF5EE')
    
    // Texto secundário: versão suave da cor
    const textSecR = Math.round(r * 0.7)
    const textSecG = Math.round(g * 0.7)
    const textSecB = Math.round(b * 0.7)
    root.style.setProperty('--text-secondary', rgbToHex(textSecR, textSecG, textSecB))
    
    // Bordas: sutis
    root.style.setProperty('--border-color', `rgba(${r}, ${g}, ${b}, 0.20)`)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const carregarEquipe = async (equipeId, isDark = false) => {
    if (!equipeId) return null
    const { data: eq } = await supabase
      .from('equipes')
      .select('*')
      .eq('id', equipeId)
      .single()
    
    if (eq?.cor_primaria) {
      aplicarCorTema(eq.cor_primaria, isDark)
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

      // Detectar tema atual
      const isDark = document.documentElement.classList.contains('dark')
      const equipe = await carregarEquipe(cliente?.equipe_id, isDark)

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
    const isDark = document.documentElement.classList.contains('dark')
    const equipe = await carregarEquipe(user.equipeId, isDark)
    if (equipe) {
      setUser(prev => ({ ...prev, equipe }))
    }
  }, [user?.equipeId])

  // Escutar mudanças de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (user?.equipe?.cor_primaria) {
        const isDark = document.documentElement.classList.contains('dark')
        aplicarCorTema(user.equipe.cor_primaria, isDark)
      }
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [user?.equipe?.cor_primaria])

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