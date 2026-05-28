import { useState, useEffect, useRef } from 'react'
import { Search, Download, Upload, MoreHorizontal, MessageCircle, Phone, Building2, Tag, Clock, MapPin, DollarSign, Plus, UserPlus, Instagram, Linkedin, Mail, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const statusOptions = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'nao_abordado', label: 'Não Abordado' },
  { value: 'abordado', label: 'Abordado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechou', label: 'Fechou' },
  { value: 'perdeu', label: 'Perdeu' },
]

export default function Contatos() {
  const { user } = useAuth()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('nao_abordado')
  const [selectedContato, setSelectedContato] = useState(null)
  const [showNovo, setShowNovo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '', email: '', empresa: '', instagram: '', linkedin: '', faturamento: '', nicho: '', tempoMercado: '' })
  const [salvando, setSalvando] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { carregarContatos() }, [user])

  const carregarContatos = async () => {
    if (!user?.equipeId) return
    setLoading(true)
    const { data } = await supabase.from('contatos').select('*').eq('equipe_id', user.equipeId).order('nome')
    const lista = (data || []).map(c => ({ ...c, status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado' }))
    setContatos(lista)
    setLoading(false)
  }

  const atualizarStatus = async (id, novoStatus) => {
    const { data: contato } = await supabase.from('contatos').select('status_por_usuario').eq('id', id).single()
    const statusAtual = contato?.status_por_usuario || {}
    statusAtual[user.uid] = novoStatus
    await supabase.from('contatos').update({ status_por_usuario: statusAtual, ultimo_contato: new Date() }).eq('id', id)
    setContatos(prev => prev.map(c => c.id === id ? { ...c, status: novoStatus } : c))
    if (selectedContato?.id === id) setSelectedContato(prev => ({ ...prev, status: novoStatus }))
    toast.success('Status atualizado!')
  }

  const handleSalvar = async () => {
    if (!novoContato.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSalvando(true)
    const { error } = await supabase.from('contatos').insert({
      nome: novoContato.nome.trim(),
      telefone: novoContato.telefone || null,
      email: novoContato.email || null,
      empresa: novoContato.empresa || null,
      instagram: novoContato.instagram || null,
      linkedin: novoContato.linkedin || null,
      faturamento: novoContato.faturamento || null,
      nicho: novoContato.nicho || null,
      tempo_mercado: novoContato.tempoMercado || null,
      tag: 'prospeccao_propria',
      status: 'nao_abordado',
      equipe_id: user.equipeId,
      criado_por: user.uid,
      status_por_usuario: {},
      data_criacao: new Date().toISOString()
    })
    if (error) { toast.error('Erro ao salvar'); setSalvando(false); return }
    toast.success('Contato adicionado!')
    setNovoContato({ nome: '', telefone: '', email: '', empresa: '', instagram: '', linkedin: '', faturamento: '', nicho: '', tempoMercado: '' })
    setShowNovo(false)
    setSalvando(false)
    carregarContatos()
  }

  const contatosFiltrados = contatos.filter(c => {
    const matchBusca = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca) || c.empresa?.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    return matchBusca && matchStatus
  })

  const formatPhone = (p) => p ? `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}` : '-'
  const whatsappLink = (c) => c.telefone ? `https://wa.me/55${c.telefone}?text=Ol%C3%A1%20${encodeURIComponent(c.nome?.split(' ')[0] || '')}` : '#'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contatos</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{loading ? 'Carregando...' : `${contatosFiltrados.length} de ${contatos.length} contatos`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNovo(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-all text-sm"><Plus size={16} /> Novo Contato</button>          <input ref={fileInputRef} type="file" accept=".csv" onChange={() => {}} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className="btn-primary flex items-center gap-2 text-sm cursor-pointer"><Upload size={16} /> Importar CSV</label>
        </div>
      </div>

      {showNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNovo(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Novo Contato</h2>
              <button onClick={() => setShowNovo(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Nome *</label><input type="text" value={novoContato.nome} onChange={e => setNovoContato({...novoContato, nome: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" autoFocus /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Telefone</label><input type="text" value={novoContato.telefone} onChange={e => setNovoContato({...novoContato, telefone: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Email</label><input type="email" value={novoContato.email} onChange={e => setNovoContato({...novoContato, email: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Empresa</label><input type="text" value={novoContato.empresa} onChange={e => setNovoContato({...novoContato, empresa: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block"><Instagram size={12} className="inline" /> Instagram</label><input type="text" value={novoContato.instagram} onChange={e => setNovoContato({...novoContato, instagram: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block"><Linkedin size={12} className="inline" /> LinkedIn</label><input type="text" value={novoContato.linkedin} onChange={e => setNovoContato({...novoContato, linkedin: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Faturamento</label><input type="text" value={novoContato.faturamento} onChange={e => setNovoContato({...novoContato, faturamento: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Nicho</label><input type="text" value={novoContato.nicho} onChange={e => setNovoContato({...novoContato, nicho: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Tempo de Mercado</label><input type="text" value={novoContato.tempoMercado} onChange={e => setNovoContato({...novoContato, tempoMercado: e.target.value})} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowNovo(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)]">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando || !novoContato.nome.trim()} className="flex-1 btn-primary text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : contatos.length === 0 ? (
          <div className="p-12 text-center"><UserPlus size={28} className="mx-auto mb-3 text-[var(--text-secondary)]" /><p className="text-sm">Nenhum contato. Cadastre ou importe.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[var(--border-color)]">
                <th className="text-left p-3 text-[10px] font-medium uppercase">Nome</th><th className="text-left p-3 text-[10px] font-medium uppercase">Telefone</th><th className="text-left p-3 text-[10px] font-medium uppercase">Email</th><th className="text-left p-3 text-[10px] font-medium uppercase">Empresa</th><th className="text-left p-3 text-[10px] font-medium uppercase">Faturamento</th><th className="text-left p-3 text-[10px] font-medium uppercase">Status</th><th className="text-left p-3 text-[10px] font-medium uppercase">WPP</th>
              </tr></thead>
              <tbody>
                {contatosFiltrados.map(c => (
                  <tr key={c.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/50">
                    <td className="p-3"><button onClick={() => setSelectedContato(c)} className="text-left hover:text-brand-500 text-sm font-medium">{c.nome}</button></td>
                    <td className="p-3 text-sm font-mono">{c.telefone ? formatPhone(c.telefone) : '-'}</td>
                    <td className="p-3 text-xs">{c.email || '-'}</td>
                    <td className="p-3 text-xs">{c.empresa || '-'}</td>
                    <td className="p-3 text-xs">{c.faturamento || '-'}</td>
                    <td className="p-3"><select value={c.status} onChange={e => atualizarStatus(c.id, e.target.value)} className="text-xs px-2 py-1 rounded-full border bg-[var(--bg-tertiary)]">{statusOptions.filter(s => s.value !== 'todos').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                    <td className="p-3">{c.telefone ? <a href={whatsappLink(c)} target="_blank" className="whatsapp-btn text-xs"><MessageCircle size={12} /> WPP</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}