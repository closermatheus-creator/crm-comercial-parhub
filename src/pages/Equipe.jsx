import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Copy, Check, UserPlus, UserMinus, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Equipe() {
  const { user } = useAuth()
  const [equipe, setEquipe] = useState(null)
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [codigoEntrada, setCodigoEntrada] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [emailBusca, setEmailBusca] = useState('')
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { carregarEquipe() }, [user])

  const carregarEquipe = async () => {
    if (!user?.equipeId) return
    const { data: eq } = await supabase.from('equipes').select('*').eq('id', user.equipeId).single()
    if (eq) {
      setEquipe(eq)
      if (eq.membros) {
        const { data: mems } = await supabase.from('clientes').select('*').in('id', eq.membros)
        setMembros(mems || [])
      }
    }
    setLoading(false)
  }

  const copiarCodigo = () => { navigator.clipboard.writeText(user.equipeId); setCopied(true); toast.success('Código copiado!'); setTimeout(() => setCopied(false), 2000) }

  const entrarNaEquipe = async () => {
    if (!codigoEntrada.trim()) return toast.error('Cole o código')
    setEntrando(true)
    const { data: eq, error } = await supabase.from('equipes').select('*').eq('id', codigoEntrada.trim()).single()
    if (error || !eq) { toast.error('Equipe não encontrada'); setEntrando(false); return }
    await supabase.from('equipes').update({ membros: [...(eq.membros || []), user.uid] }).eq('id', eq.id)
    await supabase.from('clientes').update({ equipe_id: eq.id }).eq('id', user.uid)
    toast.success('Entrou na equipe!')
    setTimeout(() => window.location.reload(), 1500)
  }

  const buscarUsuario = async () => {
    const { data } = await supabase.from('clientes').select('*').eq('email', emailBusca.trim().toLowerCase())
    if (!data || data.length === 0) { toast.error('Usuário não encontrado'); return }
    setUsuarioEncontrado(data[0])
  }

  const adicionarMembro = async () => {
    await supabase.from('equipes').update({ membros: [...(equipe.membros || []), usuarioEncontrado.id] }).eq('id', user.equipeId)
    await supabase.from('clientes').update({ equipe_id: user.equipeId }).eq('id', usuarioEncontrado.id)
    toast.success('Adicionado!')
    setUsuarioEncontrado(null)
    setEmailBusca('')
    carregarEquipe()
  }

  const removerMembro = async (id) => {
    await supabase.from('equipes').update({ membros: equipe.membros.filter(m => m !== id) }).eq('id', user.equipeId)
    await supabase.from('clientes').update({ equipe_id: null }).eq('id', id)
    toast.success('Removido!')
    carregarEquipe()
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  if (!user?.equipeId) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="card p-8 text-center">
          <Link2 size={28} className="text-brand-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Entrar em uma Equipe</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Cole o código compartilhado</p>
          <input type="text" value={codigoEntrada} onChange={e => setCodigoEntrada(e.target.value)} placeholder="Código da equipe" className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-center font-mono mb-3" />
          <button onClick={entrarNaEquipe} disabled={entrando} className="btn-primary w-full py-2.5 text-sm">{entrando ? 'Entrando...' : 'Entrar na Equipe'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Equipe</h1><p className="text-sm text-[var(--text-secondary)]">Gerencie os membros</p></div>

      <div className="card p-6">
        <div className="flex justify-between mb-4"><h3 className="text-sm font-semibold">Sua Equipe</h3><span className="text-xs text-brand-500 bg-brand-500/10 px-2 py-1 rounded-full">{membros.length} membro(s)</span></div>
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4">
          <p className="text-xs mb-2">Código da equipe</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-[var(--bg-secondary)] px-3 py-1.5 rounded flex-1 truncate">{user.equipeId}</code>
            <button onClick={copiarCodigo} className="p-2 rounded-lg hover:bg-brand-500/10">{copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</button>
          </div>
        </div>
        {membros.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold">{m.nome?.charAt(0)}</div>
              <div><p className="text-sm font-medium">{m.nome} {m.id === user.uid && <span className="text-[10px] text-brand-500">(você)</span>}</p><p className="text-xs text-[var(--text-secondary)]">{m.email}</p></div>
            </div>
            {m.id !== user.uid && <button onClick={() => removerMembro(m.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><UserMinus size={16} /></button>}
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Link2 size={16} className="text-brand-500" />Entrar em outra Equipe</h3>
        <div className="flex gap-2">
          <input type="text" value={codigoEntrada} onChange={e => setCodigoEntrada(e.target.value)} placeholder="Cole o código" className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm font-mono" />
          <button onClick={entrarNaEquipe} disabled={entrando} className="btn-primary text-sm">{entrando ? '...' : 'Entrar'}</button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserPlus size={16} className="text-brand-500" />Adicionar Membro</h3>
        <div className="flex gap-2 mb-3">
          <input type="email" value={emailBusca} onChange={e => setEmailBusca(e.target.value)} placeholder="Email Google" className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" />
          <button onClick={buscarUsuario} className="btn-primary text-sm">Buscar</button>
        </div>
        {usuarioEncontrado && (
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">{usuarioEncontrado.nome?.charAt(0)}</div>
              <div><p className="text-sm font-medium">{usuarioEncontrado.nome}</p><p className="text-xs text-[var(--text-secondary)]">{usuarioEncontrado.email}</p></div>
            </div>
            <button onClick={adicionarMembro} className="btn-primary text-sm flex items-center gap-1"><UserPlus size={14} />Adicionar</button>
          </div>
        )}
      </div>
    </div>
  )
}