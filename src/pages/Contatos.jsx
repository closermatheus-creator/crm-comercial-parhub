import { useState, useEffect, useRef } from 'react'
import { Search, Download, Upload, MoreHorizontal, MessageCircle, Phone, Building2, Tag, Clock, MapPin, DollarSign, Plus, UserPlus, Instagram, Linkedin, Mail, History, ChevronRight, X, Shield, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [statusFilter, setStatusFilter] = useState('todos')
  const [ordenacao, setOrdenacao] = useState('data')
  const [selectedContato, setSelectedContato] = useState(null)
  const [showNovo, setShowNovo] = useState(false)
  const [showPainel, setShowPainel] = useState(false)
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '', email: '', empresa: '', instagram: '', linkedin: '', faturamento: '', nicho: '', tempoMercado: '' })
  const [dadosExtras, setDadosExtras] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [atividades, setAtividades] = useState([])
  const [carregandoAtividades, setCarregandoAtividades] = useState(false)
  const [membrosEquipe, setMembrosEquipe] = useState([])
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [importando, setImportando] = useState(false)
  const fileInputRef = useRef(null)

  const isAdmin = user?.role === 'admin'
  const camposPersonalizados = user?.camposPersonalizados || []

  useEffect(() => { 
    if (user?.equipeId) {
      carregarContatos()
      if (isAdmin) carregarMembros()
    }
  }, [user?.equipeId, ordenacao])

  const carregarMembros = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('equipe_id', user.equipeId)
    setMembrosEquipe(data || [])
  }

  const carregarAtividades = async (contatoId) => {
    setCarregandoAtividades(true)
    const { data } = await supabase
      .from('atividades')
      .select('*')
      .eq('contato_id', contatoId)
      .order('criado_em', { ascending: false })
    setAtividades(data || [])
    setCarregandoAtividades(false)
  }

  const carregarContatos = async () => {
    if (!user?.equipeId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      let query = supabase.from('contatos').select('*').eq('equipe_id', user.equipeId)
      
      if (!isAdmin) {
        query = query.eq('criado_por', user.uid)
      }
      
      switch (ordenacao) {
        case 'nome':
          query = query.order('nome', { ascending: true })
          break
        case 'nome_desc':
          query = query.order('nome', { ascending: false })
          break
        case 'data':
          query = query.order('data_criacao', { ascending: false })
          break
        case 'data_antiga':
          query = query.order('data_criacao', { ascending: true })
          break
        case 'status':
          query = query.order('status')
          break
        default:
          query = query.order('data_criacao', { ascending: false })
      }
      
      const { data, error } = await query
      if (error) throw error
      
      const lista = (data || []).map(c => ({ ...c, status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado' }))
      setContatos(lista)
    } catch (err) {
      console.error('Erro ao carregar contatos:', err)
      setContatos([])
    } finally {
      setLoading(false)
    }
  }

  const atualizarStatus = async (id, novoStatus) => {
    const { data: contato } = await supabase.from('contatos').select('status_por_usuario,nome').eq('id', id).single()
    const statusAtual = contato?.status_por_usuario || {}
    const statusAntigo = statusAtual[user.uid] || 'nao_abordado'
    statusAtual[user.uid] = novoStatus
    await supabase.from('contatos').update({ status_por_usuario: statusAtual, ultimo_contato: new Date() }).eq('id', id)
    
    await supabase.from('atividades').insert({
      contato_id: id,
      contato_nome: contato?.nome,
      equipe_id: user.equipeId,
      tipo: 'status',
      descricao: `Status alterado de "${statusAntigo}" para "${novoStatus}"`,
      status_anterior: statusAntigo,
      status_novo: novoStatus,
      criado_por: user.uid,
      criado_em: new Date()
    })
    
    setContatos(prev => prev.map(c => c.id === id ? { ...c, status: novoStatus } : c))
    if (selectedContato?.id === id) {
      setSelectedContato(prev => ({ ...prev, status: novoStatus }))
      carregarAtividades(id)
    }
    toast.success('Status atualizado!')
  }

  const abrirNovoContato = () => {
    setNovoContato({ nome: '', telefone: '', email: '', empresa: '', instagram: '', linkedin: '', faturamento: '', nicho: '', tempoMercado: '' })
    const extrasIniciais = {}
    camposPersonalizados.forEach(campo => {
      extrasIniciais[campo.nome] = ''
    })
    setDadosExtras(extrasIniciais)
    setShowNovo(true)
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
      dados_extras: dadosExtras,
      tag: 'prospeccao_propria',
      status: 'nao_abordado',
      equipe_id: user.equipeId,
      criado_por: user.uid,
      status_por_usuario: {},
      data_criacao: new Date().toISOString()
    })
    if (error) { toast.error('Erro ao salvar'); setSalvando(false); return }

    const { data: novo } = await supabase.from('contatos').select('id').eq('equipe_id', user.equipeId).order('data_criacao', { ascending: false }).limit(1).single()
    if (novo) {
      await supabase.from('atividades').insert({
        contato_id: novo.id,
        contato_nome: novoContato.nome.trim(),
        equipe_id: user.equipeId,
        tipo: 'criacao',
        descricao: 'Contato criado',
        criado_por: user.uid,
        criado_em: new Date()
      })
    }

    toast.success('Contato adicionado!')
    setNovoContato({ nome: '', telefone: '', email: '', empresa: '', instagram: '', linkedin: '', faturamento: '', nicho: '', tempoMercado: '' })
    setDadosExtras({})
    setShowNovo(false)
    setSalvando(false)
    carregarContatos()
  }

  const handleImportarCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo .csv')
      return
    }

    setImportando(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const texto = event.target.result
        const linhas = texto.split('\n').filter(l => l.trim())
        
        if (linhas.length < 2) {
          toast.error('O arquivo CSV precisa ter pelo menos cabeçalho + 1 linha de dados')
          setImportando(false)
          return
        }

        // Extrair cabeçalho (primeira linha)
        const cabecalho = linhas[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

        // Mapear colunas do CSV para campos do banco
        const mapeamento = {
          'nome': 'nome',
          'name': 'nome',
          'telefone': 'telefone',
          'phone': 'telefone',
          'celular': 'telefone',
          'whatsapp': 'telefone',
          'email': 'email',
          'e-mail': 'email',
          'empresa': 'empresa',
          'company': 'empresa',
          'instagram': 'instagram',
          'linkedin': 'linkedin',
          'faturamento': 'faturamento',
          'nicho': 'nicho',
          'tempo_mercado': 'tempoMercado',
          'tempo de mercado': 'tempoMercado',
          'tag': 'tag',
          'status': 'status',
          'observacoes': 'observacoes'
        }

        const contatosInserir = []
        const erros = []

        for (let i = 1; i < linhas.length; i++) {
          const valores = linhas[i].split(',').map(v => v.trim().replace(/"/g, ''))
          
          if (valores.length === 0 || (valores.length === 1 && !valores[0])) continue

          const contato = {
            equipe_id: user.equipeId,
            criado_por: user.uid,
            status_por_usuario: {},
            data_criacao: new Date().toISOString(),
            tag: 'csv_import',
            status: 'nao_abordado',
            dados_extras: {}
          }

          cabecalho.forEach((col, index) => {
            const valor = valores[index] || ''
            const campo = mapeamento[col]

            if (campo && valor) {
              if (['nome', 'telefone', 'email', 'empresa', 'instagram', 'linkedin', 'faturamento', 'nicho'].includes(campo)) {
                contato[campo] = valor
              } else if (campo === 'tempoMercado') {
                contato.tempo_mercado = valor
              } else if (campo === 'tag') {
                contato.tag = valor
              } else if (campo === 'status') {
                const statusValido = statusOptions.find(s => s.value === valor.toLowerCase() || s.label.toLowerCase() === valor.toLowerCase())
                contato.status = statusValido ? statusValido.value : 'nao_abordado'
              } else {
                contato.dados_extras[col] = valor
              }
            }
          })

          if (!contato.nome || !contato.nome.trim()) {
            erros.push(`Linha ${i + 1}: nome é obrigatório`)
            continue
          }

          contatosInserir.push(contato)
        }

        if (contatosInserir.length === 0) {
          toast.error('Nenhum contato válido encontrado no arquivo')
          setImportando(false)
          return
        }

        // Inserir em lotes de 50
        const lote = 50
        let inseridos = 0

        for (let i = 0; i < contatosInserir.length; i += lote) {
          const loteContatos = contatosInserir.slice(i, i + lote)
          const { error } = await supabase.from('contatos').insert(loteContatos)
          
          if (error) {
            console.error('Erro ao importar lote:', error)
            erros.push(`Erro ao importar lote ${i / lote + 1}`)
          } else {
            inseridos += loteContatos.length
          }
        }

        if (inseridos > 0) {
          toast.success(`${inseridos} contato(s) importado(s) com sucesso!`)
          carregarContatos()
        }

        if (erros.length > 0) {
          console.warn('Erros na importação:', erros)
          if (erros.length <= 5) {
            erros.forEach(e => toast.error(e))
          } else {
            toast.error(`${erros.length} erros encontrados. Verifique o console.`)
          }
        }
      } catch (err) {
        console.error('Erro ao processar CSV:', err)
        toast.error('Erro ao processar o arquivo CSV')
      } finally {
        setImportando(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo')
      setImportando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    reader.readAsText(file)
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const sistemaNome = user?.equipe?.nome_sistema || 'PARHUB CRM'
    
    doc.setFontSize(16)
    doc.text(sistemaNome, 14, 18)
    doc.setFontSize(11)
    doc.text('Relatório de Contatos', 14, 26)
    doc.setFontSize(9)
    doc.text(`Gerado em: ${dataAtual} | Total: ${contatosFiltrados.length} contatos`, 14, 32)
    
    const colunas = [
      'Nome', 
      ...(isAdmin ? ['Dono'] : []), 
      'Telefone', 
      'Email', 
      'Empresa', 
      ...camposPersonalizados.map(c => c.nome), 
      'Status'
    ]
    
    const linhas = contatosFiltrados.map(c => [
      c.nome || '-',
      ...(isAdmin ? [(c.criado_por === user.uid ? 'Você' : getMembroNome(c.criado_por) || '-')] : []),
      c.telefone ? formatPhone(c.telefone) : '-',
      c.email || '-',
      c.empresa || '-',
      ...camposPersonalizados.map(cp => c.dados_extras?.[cp.nome] || '-'),
      statusOptions.find(s => s.value === c.status)?.label || c.status
    ])
    
    autoTable(doc, {
      startY: 38,
      head: [colunas],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [30, 45, 83], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2 },
    })
    
    doc.save(`contatos-${dataAtual.replace(/\//g, '-')}.pdf`)
  }

  const contatosFiltrados = contatos.filter(c => {
    const matchBusca = !busca || 
      c.nome?.toLowerCase().includes(busca.toLowerCase()) || 
      c.telefone?.includes(busca) || 
      c.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchMembro = filtroMembro === 'todos' || c.criado_por === filtroMembro
    return matchBusca && matchStatus && matchMembro
  })

  const formatPhone = (p) => p ? `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}` : '-'
  const whatsappLink = (c) => c.telefone ? `https://wa.me/55${c.telefone}?text=Ol%C3%A1%20${encodeURIComponent(c.nome?.split(' ')[0] || '')}` : '#'

  const getMembroNome = (criadoPor) => {
    if (!criadoPor) return ''
    const membro = membrosEquipe.find(m => m.id === criadoPor)
    return membro ? membro.nome : ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contatos</h1>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 flex items-center gap-1">
                <Shield size={10} /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Carregando...' : isAdmin 
              ? `${contatosFiltrados.length} de ${contatos.length} contatos da equipe`
              : `${contatosFiltrados.length} de ${contatos.length} contatos`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={abrirNovoContato} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-all text-sm"><Plus size={16} /> Novo Contato</button>
          <button onClick={exportarPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all text-sm"><FileText size={16} /> Exportar PDF</button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportarCSV} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className={`btn-primary flex items-center gap-2 text-sm cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={16} /> {importando ? 'Importando...' : 'Importar CSV'}
          </label>
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
              
              {camposPersonalizados.map((campo, index) => (
                <div key={index}>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">{campo.nome}</label>
                  <input
                    type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'data' ? 'date' : 'text'}
                    value={dadosExtras[campo.nome] || ''}
                    onChange={e => setDadosExtras(prev => ({ ...prev, [campo.nome]: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowNovo(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)]">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando || !novoContato.nome.trim()} className="flex-1 btn-primary text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input type="text" placeholder="Buscar por nome, telefone, email ou empresa..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isAdmin && membrosEquipe.length > 0 && (
            <select value={filtroMembro} onChange={e => setFiltroMembro(e.target.value)} className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm">
              <option value="todos">Todos os membros</option>
              {membrosEquipe.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          )}
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)} className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm">
            <option value="nome">Nome A-Z</option>
            <option value="nome_desc">Nome Z-A</option>
            <option value="data">Mais recentes</option>
            <option value="data_antiga">Mais antigos</option>
            <option value="status">Por status</option>
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
                <th className="text-left p-3 text-[10px] font-medium uppercase">Nome</th>
                {isAdmin && <th className="text-left p-3 text-[10px] font-medium uppercase">Dono</th>}
                <th className="text-left p-3 text-[10px] font-medium uppercase">Telefone</th>
                <th className="text-left p-3 text-[10px] font-medium uppercase">Email</th>
                <th className="text-left p-3 text-[10px] font-medium uppercase">Empresa</th>
                <th className="text-left p-3 text-[10px] font-medium uppercase">Faturamento</th>
                {camposPersonalizados.map((campo, i) => (
                  <th key={i} className="text-left p-3 text-[10px] font-medium uppercase">{campo.nome}</th>
                ))}
                <th className="text-left p-3 text-[10px] font-medium uppercase">Status</th>
                <th className="text-left p-3 text-[10px] font-medium uppercase">WPP</th>
              </tr></thead>
              <tbody>
                {contatosFiltrados.map(c => (
                  <tr key={c.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/50">
                    <td className="p-3"><button onClick={() => { setSelectedContato(c); setShowPainel(true); carregarAtividades(c.id) }} className="text-left hover:text-brand-500 text-sm font-medium">{c.nome}</button></td>
                    {isAdmin && (
                      <td className="p-3 text-xs text-[var(--text-secondary)]">
                        {c.criado_por === user.uid ? 'Você' : getMembroNome(c.criado_por) || '-'}
                      </td>
                    )}
                    <td className="p-3 text-sm font-mono">{c.telefone ? formatPhone(c.telefone) : '-'}</td>
                    <td className="p-3 text-xs">{c.email || '-'}</td>
                    <td className="p-3 text-xs">{c.empresa || '-'}</td>
                    <td className="p-3 text-xs">{c.faturamento || '-'}</td>
                    {camposPersonalizados.map((campo, i) => (
                      <td key={i} className="p-3 text-xs">{c.dados_extras?.[campo.nome] || '-'}</td>
                    ))}
                    <td className="p-3"><select value={c.status} onChange={e => atualizarStatus(c.id, e.target.value)} className="text-xs px-2 py-1 rounded-full border bg-[var(--bg-tertiary)]">{statusOptions.filter(s => s.value !== 'todos').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                    <td className="p-3">{c.telefone ? <a href={whatsappLink(c)} target="_blank" className="whatsapp-btn text-xs"><MessageCircle size={12} /> WPP</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPainel && selectedContato && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowPainel(false); setSelectedContato(null) }} />
          <div className="relative bg-[var(--bg-secondary)] border-l border-[var(--border-color)] w-full max-w-md shadow-2xl z-10 h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedContato.nome}</h2>
                  {isAdmin && selectedContato.criado_por !== user.uid && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Cadastrado por: {getMembroNome(selectedContato.criado_por) || 'Desconhecido'}
                    </p>
                  )}
                </div>
                <button onClick={() => { setShowPainel(false); setSelectedContato(null) }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"><X size={20} /></button>
              </div>
              
              <div className="space-y-3 mb-6">
                {selectedContato.telefone && <p className="text-sm text-[var(--text-secondary)]"><Phone size={14} className="inline mr-2" />{formatPhone(selectedContato.telefone)}</p>}
                {selectedContato.email && <p className="text-sm text-[var(--text-secondary)]"><Mail size={14} className="inline mr-2" />{selectedContato.email}</p>}
                {selectedContato.empresa && <p className="text-sm text-[var(--text-secondary)]"><Building2 size={14} className="inline mr-2" />{selectedContato.empresa}</p>}
                {camposPersonalizados.map((campo, i) => (
                  selectedContato.dados_extras?.[campo.nome] && (
                    <p key={i} className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium">{campo.nome}:</span> {selectedContato.dados_extras[campo.nome]}
                    </p>
                  )
                ))}
              </div>

              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2"><History size={16} /> Histórico de Atividades</h3>
              
              {carregandoAtividades ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : atividades.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-3">
                  {atividades.map(a => (
                    <div key={a.id} className="flex gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">{a.descricao}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
