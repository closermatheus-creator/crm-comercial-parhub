import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const configurarUsuario = async (authUser) => {
    try {
      // Buscar na tabela clientes (nova estrutura comercial)
      const { data: clienteExiste } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', authUser.id)
        .single()

      let equipeId = null

      if (!clienteExiste) {
        // PRIMEIRO LOGIN: Criar equipe e cliente
        const novoEquipeId = crypto.randomUUID()
        
        await supabase.from('equipes').insert({
          id: novoEquipeId,
          nome: authUser.user_metadata?.full_name || 'Minha Empresa',
          membros: [authUser.id],
          criado_por: authUser.id,
          ativo: true,
          plano: 'essencial',
          logo_url: null,
          cor_primaria: '#a855f7',
          nome_sistema: 'PARHUB CRM',
          campos_personalizados: []
        })

        await supabase.from('clientes').insert({
          id: authUser.id,
          nome: authUser.user_metadata?.full_name || authUser.email,
          email: authUser.email,
          foto: authUser.user_metadata?.avatar_url,
          equipe_id: novoEquipeId,
          role: 'admin',
          criado_em: new Date()
        })

        equipeId = novoEquipeId
      } else {
        equipeId = clienteExiste.equipe_id

        if (!equipeId) {
          const novoEquipeId = crypto.randomUUID()
          await supabase.from('equipes').insert({
            id: novoEquipeId,
            nome: authUser.user_metadata?.full_name || 'Minha Empresa',
            membros: [authUser.id],
            criado_por: authUser.id,
            ativo: true,
            plano: 'essencial',
            logo_url: null,
            cor_primaria: '#a855f7',
            nome_sistema: 'PARHUB CRM',
            campos_personalizados: []
          })
          await supabase.from('clientes').update({ equipe_id: novoEquipeId }).eq('id', authUser.id)
          equipeId = novoEquipeId
        }
      }

      // Buscar dados da equipe para personalização
      const { data: equipeData } = await supabase
        .from('equipes')
        .select('*')
        .eq('id', equipeId)
        .single()

      return {
        uid: authUser.id,
        nome: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        foto: authUser.user_metadata?.avatar_url,
        equipeId: equipeId,
        equipe: equipeData
      }
    } catch (error) {
      console.error('Erro ao configurar usuário:', error)
      return {
        uid: authUser.id,
        nome: authUser.user_metadata?.full_name,
        email: authUser.email,
        foto: authUser.user_metadata?.avatar_url,
        equipeId: null,
        equipe: null
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await configurarUsuario(session.user)
        setUser(userData)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = await configurarUsuario(session.user)
        setUser(userData)
      } else {
        setUser(null)
      }
      setLoading(false)
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