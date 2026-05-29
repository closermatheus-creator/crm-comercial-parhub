import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

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