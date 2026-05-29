import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarUsuario = async (authUser) => {
      try {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('equipe_id, role')
          .eq('id', authUser.id)
          .single()

        let equipe = null
        if (cliente?.equipe_id) {
          const { data: eq } = await supabase
            .from('equipes')
            .select('*')
            .eq('id', cliente.equipe_id)
            .single()
          equipe = eq
        }

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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}