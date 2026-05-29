import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Copy, Check, UserPlus, UserMinus, Link2, Palette, Upload, Save, Shield, ShieldOff, Lock, Plus, Trash2, Columns } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Equipe() {
  const { user, recarregarEquipe } = useAuth()
  const navigate = useNavigate()
  const [equipe, setEquipe] = useState(null)
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [codigoEntrada, setCodigoEntrada] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [emailBusca, setEmailBusca] = useState('')
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)
  const [copied, setCopied] = useState(false)

  // White Label
  const [editando, setEditando] = useState(false)
  const [salvandoBranding, setSalvandoBranding] = useState(false)
  const [branding, setBranding] = useState({
    nome_sistema: '',
    cor_primaria: '#a855f7',
    logo_url: ''
  })

  // Campos Personalizados
  const [camposPersonalizados, setCamposPersonalizados] = useState([])
  const [novoCampo, setNovoCampo] = useState({ nome: '', tipo: 'texto' })
  const [adicionandoCampo, setAdicionandoCampo] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/overview')
      return
    }
    carregarEquipe()
  }, [user])

  const carregarEquipe = async () => {
    if (!user?.equipeId) return
    const { data: eq } = await supabase.from('equipes').select('*').eq('id', user.equipeId).single()
    if (eq) {
      setEquipe(eq)
      setBranding({
        nome_sistema: eq.nome_sistema || 'PARHUB CRM',
        cor_primaria: eq.cor_primaria || '#a855f7',
        logo_url: eq.logo_url || ''
      })
      setCamposPersonalizados(eq.campos_personalizados || [])
      if (eq.membros) {
        const { data: mems } = await supabase.from('clientes').select('*').in('id', eq.membros)
        setMembros(mems || [])
      }
    }
    setLoading(false)
  }

  const salvarBranding = async () => {
    setSalvandoBranding(true)
    const { error } = await supabase
      .from('equipes')
      .update({
        nome_sistema: branding.nome_sistema,
        cor_primaria: branding.cor_primaria,
        logo_url: branding.logo_url || null
      })
      .eq('id', user.equipeId)

    if (error) {
      toast.error('Erro ao salvar')
    } else {
      await recarregarEquipe()
      toast.success('Personalização salva!')
      setEquipe(prev => ({ ...prev, ...branding }))
      setEditando(false)
    }
    setSalvandoBranding(false)
  }

  const adicionarCampo = async () => {
    if (!novoCampo.nome.trim()) return toast.error('Nome do campo é obrigatório')
    
    const campoExiste = camposPersonalizados.find(c => c.nome.toLowerCase() === novoCampo.nome.trim().toLowerCase())
    if (campoExiste) return toast.error('Este campo já existe')
    
    const novosCampos = [...camposPersonalizados, { nome: novoCampo.nome.trim(), tipo: novoCampo.tipo }]
    
    const { error } = await supabase
      .from('equipes')
      .update({ campos_personalizados: novosCampos })
      .eq('id', user.equipeId)
    
    if (error) {
      toast.error('Erro ao adicionar campo')
    } else {
      setCamposPersonalizados(novosCampos)
      setNovoCampo({ nome: '', tipo: 'texto' })
      setAdicionandoCampo(false)
      await recarregarEquipe()
      toast.success('Campo adicionado!')
    }
  }

  const removerCampo = async (index) => {
    const novosCampos = camposPersonalizados.filter((_, i) => i !== index)
    
    const { error } = await supabase
      .from('equipes')
      .update({ campos_personalizados: novosCampos })
      .eq('id', user.equipeId)
    
    if (error) {
      toast.error('Erro ao remover campo')
    } else {
      setCamposPersonalizados(novosCampos)
      await recarregarEquipe()
      toast.success('Campo removido!')
    }
  }

  const toggleAdmin = async (membroId, novaRole) => {
    const { error } = await supabase
      .from('clientes')
      .update({ role: novaRole })
      .eq('id', membroId)
    
    if (error) {
      toast.error('Erro ao alterar permissão')
    } else {
      toast.success(novaRole === 'admin' ? 'Admin promovido!' : 'Admin removido!')
      carregarEquipe()
    }
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
    if (membros.find(m => m.id === data[0].id)) { toast.error('Usuário já é membro'); return }
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
    if (membros.filter(m => m.role === 'admin').length === 1 && membros.find(m => m.id === id)?.role === 'admin') {
      toast.error('Não é possível remover o último admin')
      return
    }
    await supabase.from('equipes').update({ membros: equipe.membros.filter(m => m !== id) }).eq('id', user.equipeId)
    await supabase.from('clientes').update({ equipe_id: null, role: 'membro' }).eq('id', id)
    toast.success('Removido!')
    carregarEquipe()
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Lock size={40} className="mx-auto mb-4 text-[var(--text-secondary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Acesso Restrito</h2>
          <p className="text-sm text-[var(--text-secondary)]">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    )
  }

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
      <div>
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-[var(--text-secondary)]">Gerencie membros, campos e personalização</p>
      </div>

      {/* Membros */}
      <div className="card p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-sm font-semibold">Membros da Equipe</h3>
          <span className="text-xs text-brand-500 bg-brand-500/10 px-2 py-1 rounded-full">{membros.length} membro(s)</span>
        </div>
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
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{m.nome} {m.id === user.uid && <span className="text-[10px] text-brand-500">(você)</span>}</p>
                  {m.role === 'admin' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-500 flex items-center gap-0.5">
                      <Shield size={8} /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{m.email}</p>
              </div>
            </div>
            {m.id !== user.uid && (
              <div className="flex items-center gap-1">
                <button onClick={() => toggleAdmin(m.id, m.role === 'admin' ? 'membro' : 'admin')} className={`p-2 rounded-lg transition-colors ${m.role === 'admin' ? 'hover:bg-amber-500/10 text-amber-500' : 'hover:bg-brand-500/10 text-[var(--text-secondary)]'}`}>
                  {m.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                </button>
                <button onClick={() => removerMembro(m.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500">
                  <UserMinus size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar Membro */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserPlus size={16} className="text-brand-500" />Adicionar Membro</h3>
        <div className="flex gap-2 mb-3">
          <input type="email" value={emailBusca} onChange={e => setEmailBusca(e.target.value)} placeholder="Email Google do usuário" className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" />
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

      {/* Campos Personalizados */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Columns size={16} className="text-brand-500" />Campos Personalizados</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Crie campos extras para os contatos da sua equipe.</p>
        
        {camposPersonalizados.length === 0 && !adicionandoCampo ? (
          <div className="text-center py-4 text-sm text-[var(--text-secondary)]">
            Nenhum campo personalizado. Clique em "Adicionar Campo" para criar.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {camposPersonalizados.map((campo, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{campo.nome}</p>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{campo.tipo}</p>
                </div>
                <button onClick={() => removerCampo(index)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {adicionandoCampo && (
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-3 space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Nome do Campo</label>
              <input type="text" value={novoCampo.nome} onChange={e => setNovoCampo({ ...novoCampo, nome: e.target.value })} placeholder="Ex: CPF, Origem, etc." className="w-full px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm" autoFocus />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Tipo</label>
              <select value={novoCampo.tipo} onChange={e => setNovoCampo({ ...novoCampo, tipo: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm">
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="data">Data</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={adicionarCampo} className="btn-primary text-sm flex-1">Adicionar</button>
              <button onClick={() => { setAdicionandoCampo(false); setNovoCampo({ nome: '', tipo: 'texto' }) }} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)]">Cancelar</button>
            </div>
          </div>
        )}

        {!adicionandoCampo && (
          <button onClick={() => setAdicionandoCampo(true)} className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
            <Plus size={12} /> Adicionar Campo
          </button>
        )}
      </div>

      {/* White Label */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Palette size={16} className="text-brand-500" />Personalização (White Label)</h3>
          {!editando ? (
            <button onClick={() => setEditando(true)} className="text-xs text-brand-500 hover:underline">Editar</button>
          ) : (
            <button onClick={salvarBranding} disabled={salvandoBranding} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs">
              <Save size={12} /> {salvandoBranding ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>

        {editando ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Nome do Sistema</label>
              <input type="text" value={branding.nome_sistema} onChange={e => setBranding({ ...branding, nome_sistema: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" placeholder="PARHUB CRM" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Cor Primária</label>
              <div className="flex gap-2">
                <input type="color" value={branding.cor_primaria} onChange={e => setBranding({ ...branding, cor_primaria: e.target.value })} className="w-12 h-10 rounded-lg border border-[var(--border-color)] cursor-pointer bg-[var(--bg-tertiary)]" />
                <input type="text" value={branding.cor_primaria} onChange={e => setBranding({ ...branding, cor_primaria: e.target.value })} className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm font-mono" placeholder="#a855f7" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block flex items-center gap-1"><Upload size={12} /> URL do Logo</label>
              <input type="text" value={branding.logo_url} onChange={e => setBranding({ ...branding, logo_url: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" placeholder="https://..." />
              {branding.logo_url && <img src={branding.logo_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover mt-2 border border-[var(--border-color)]" />}
            </div>
            <button onClick={() => { setEditando(false); setBranding({ nome_sistema: equipe?.nome_sistema || 'PARHUB CRM', cor_primaria: equipe?.cor_primaria || '#a855f7', logo_url: equipe?.logo_url || '' }) }} className="text-xs text-[var(--text-secondary)] hover:underline">Cancelar</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--brand-text)] font-bold text-lg" style={{ backgroundColor: branding.cor_primaria }}>
                {branding.logo_url ? <img src={branding.logo_url} alt="" className="w-full h-full rounded-lg object-cover" /> : branding.nome_sistema?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{branding.nome_sistema}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-3 h-3 rounded-full border border-[var(--border-color)]" style={{ backgroundColor: branding.cor_primaria }} />
                  <p className="text-xs text-[var(--text-secondary)] font-mono">{branding.cor_primaria}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}