import { useState, useEffect, useRef } from 'react'
import { 
  Search, Download, Upload, MoreHorizontal, MessageCircle, Phone, 
  Building2, Tag, Clock, MapPin, DollarSign, Plus, UserPlus, 
  Instagram, Linkedin, Mail, History, ChevronRight, X, Shield, 
  FileText, List, FolderPlus, Check, Trash2, Edit2, Undo2, AlertTriangle,
  Calendar, CheckCircle, Eye, Clock as ClockIcon, Pencil, Save, Percent
} from 'lucide-react'
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
  const [showListas, setShowListas] = useState(false)
  const [listaSelecionada, setListaSelecionada] = useState(null)
  const [listas, setListas] = useState([])
  const [novaListaNome, setNovaListaNome] = useState('')
  const [criandoLista, setCriandoLista] = useState(false)
  const [importando, setImportando] = useState(false)
  const [desfazendo, setDesfazendo] = useState(false)
  const [ultimaImportacao, setUltimaImportacao] = useState(null)
  const [showHistorico, setShowHistorico] = useState(false)
  const [showLixeira, setShowLixeira] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [listaParaImportar, setListaParaImportar] = useState(null)
  const [novaListaImport, setNovaListaImport] = useState('')
  const [criandoListaImport, setCriandoListaImport] = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(null)
  const [showRespostaModal, setShowRespostaModal] = useState(null)
  const [showAnotacaoModal, setShowAnotacaoModal] = useState(null)
  const [anotacoesFollow, setAnotacoesFollow] = useState('')
  const [anotacoesResposta, setAnotacoesResposta] = useState('')
  const [anotacaoTexto, setAnotacaoTexto] = useState('')
  const [salvandoFollow, setSalvandoFollow] = useState(false)
  const [salvandoResposta, setSalvandoResposta] = useState(false)
  const [salvandoAnotacao, setSalvandoAnotacao] = useState(false)
  const [importacoes, setImportacoes] = useState([])
  const [loadingImportacoes, setLoadingImportacoes] = useState(false)
  const [contatosDeletados, setContatosDeletados] = useState([])
  const [loadingDeletados, setLoadingDeletados] = useState(false)
  const [editandoValor, setEditandoValor] = useState(false)
  const [editandoComissao, setEditandoComissao] = useState(false)
  const fileInputRef = useRef(null)
  
  const [novoContato, setNovoContato] = useState({ 
    nome: '', 
    telefone: '', 
    email: '', 
    empresa: '', 
    instagram: '', 
    linkedin: '', 
    faturamento: '', 
    nicho: '', 
    tempoMercado: '' 
  })
  const [dadosExtras, setDadosExtras] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [atividades, setAtividades] = useState([])
  const [carregandoAtividades, setCarregandoAtividades] = useState(false)
  const [membrosEquipe, setMembrosEquipe] = useState([])
  const [filtroMembro, setFiltroMembro] = useState('todos')

  const isAdmin = user?.role === 'admin'
  const camposPersonalizados = user?.camposPersonalizados || []

  // ============================================
  // CARREGAR DADOS
  // ============================================

  const carregarUltimaImportacao = async () => {
    if (!user?.equipeId) return
    const { data } = await supabase
      .from('importacoes_historico')
      .select('*')
      .eq('equipe_id', user.equipeId)
      .eq('criado_por', user.uid)
      .eq('status', 'concluida')
      .order('data_importacao', { ascending: false })
      .limit(1)
    
    if (data && data.length > 0) {
      setUltimaImportacao(data[0])
    } else {
      setUltimaImportacao(null)
    }
  }

  const carregarListas = async () => {
    if (!user?.equipeId) return
    const { data } = await supabase
      .from('listas')
      .select('*')
      .eq('equipe_id', user.equipeId)
      .order('criado_em', { ascending: false })
    setListas(data || [])
  }

  useEffect(() => { 
    if (user?.equipeId) {
      carregarContatos()
      carregarListas()
      carregarUltimaImportacao()
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
    
    // Buscar atividades da tabela atividades
    const { data: atividadesData } = await supabase
      .from('atividades')
      .select('*')
      .eq('contato_id', contatoId)
      .order('criado_em', { ascending: false })
    
    // Buscar follow-ups do histórico
    const { data: followUpsData } = await supabase
      .from('follow_ups_historico')
      .select('*')
      .eq('contato_id', contatoId)
      .order('criado_em', { ascending: false })
    
    // Combinar e ordenar por data
    const todasAtividades = [
      ...(atividadesData || []).map(a => ({ ...a, tipo_atividade: 'atividade' })),
      ...(followUpsData || []).map(f => ({ 
        ...f, 
        tipo_atividade: f.tipo === 'follow_up' ? 'follow_up' : 'resposta',
        descricao: f.tipo === 'follow_up' ? '📅 Follow-up registrado' : '💬 Resposta registrada'
      }))
    ]
    
    todasAtividades.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    
    setAtividades(todasAtividades)
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
      
      if (listaSelecionada) {
        query = query.eq('lista_id', listaSelecionada)
      }
      
      if (!isAdmin) {
        query = query.eq('criado_por', user.uid)
      }
      
      query = query.is('deletado_em', null)
      
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
      
      const lista = (data || []).map(c => ({ 
        ...c, 
        status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado' 
      }))
      setContatos(lista)
    } catch (err) {
      console.error('Erro ao carregar contatos:', err)
      setContatos([])
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ATUALIZAR STATUS
  // ============================================

  const atualizarStatus = async (id, novoStatus) => {
    const { data: contato } = await supabase
      .from('contatos')
      .select('status_por_usuario,nome')
      .eq('id', id)
      .single()
    
    const statusAtual = contato?.status_por_usuario || {}
    const statusAntigo = statusAtual[user.uid] || 'nao_abordado'
    statusAtual[user.uid] = novoStatus
    
    await supabase
      .from('contatos')
      .update({ 
        status_por_usuario: statusAtual, 
        ultimo_contato: new Date().toISOString() 
      })
      .eq('id', id)
    
    await supabase.from('atividades').insert({
      contato_id: id,
      contato_nome: contato?.nome,
      equipe_id: user.equipeId,
      tipo: 'status',
      descricao: `Status alterado de "${statusAntigo}" para "${novoStatus}"`,
      status_anterior: statusAntigo,
      status_novo: novoStatus,
      criado_por: user.uid,
      criado_em: new Date().toISOString()
    })
    
    setContatos(prev => prev.map(c => c.id === id ? { ...c, status: novoStatus } : c))
    if (selectedContato?.id === id) {
      setSelectedContato(prev => ({ ...prev, status: novoStatus }))
      carregarAtividades(id)
    }
    toast.success('Status atualizado!')
  }

  // ============================================
  // FOLLOW-UP E RESPOSTA
  // ============================================

  const handleFollowUp = async (contato) => {
    setShowFollowModal(contato)
    setAnotacoesFollow('')
  }

  const registrarFollowUp = async () => {
    if (!showFollowModal) return
    
    setSalvandoFollow(true)
    try {
      const { data, error } = await supabase.rpc('registrar_follow_up', {
        contato_id_param: showFollowModal.id,
        equipe_id_param: user.equipeId,
        criado_por_param: user.uid,
        anotacoes_param: anotacoesFollow || null
      })

      if (error) throw error

      if (data?.sucesso) {
        toast.success(data.mensagem)
        setShowFollowModal(null)
        setAnotacoesFollow('')
        carregarContatos()
        if (selectedContato?.id === showFollowModal.id) {
          carregarAtividades(showFollowModal.id)
          setSelectedContato(prev => ({ 
            ...prev, 
            total_follow_ups: data.total,
            ultimo_follow_up: new Date().toISOString()
          }))
        }
      } else {
        toast.error(data?.mensagem || 'Erro ao registrar follow-up')
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao registrar follow-up')
    } finally {
      setSalvandoFollow(false)
    }
  }

  const handleResposta = async (contato) => {
    setShowRespostaModal(contato)
    setAnotacoesResposta('')
  }

  const registrarResposta = async () => {
    if (!showRespostaModal) return
    
    setSalvandoResposta(true)
    try {
      const { data, error } = await supabase.rpc('registrar_resposta', {
        contato_id_param: showRespostaModal.id,
        equipe_id_param: user.equipeId,
        criado_por_param: user.uid,
        anotacoes_param: anotacoesResposta || null
      })

      if (error) throw error

      if (data?.sucesso) {
        toast.success(data.mensagem)
        setShowRespostaModal(null)
        setAnotacoesResposta('')
        carregarContatos()
        if (selectedContato?.id === showRespostaModal.id) {
          carregarAtividades(showRespostaModal.id)
          setSelectedContato(prev => ({ 
            ...prev, 
            total_respostas: data.total,
            ultima_resposta: new Date().toISOString()
          }))
        }
      } else {
        toast.error(data?.mensagem || 'Erro ao registrar resposta')
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao registrar resposta')
    } finally {
      setSalvandoResposta(false)
    }
  }

  // ============================================
  // ANOTAÇÕES
  // ============================================

  const handleAdicionarAnotacao = (contato) => {
    setShowAnotacaoModal(contato)
    setAnotacaoTexto('')
  }

  const salvarAnotacao = async () => {
    if (!showAnotacaoModal || !anotacaoTexto.trim()) {
      toast.error('Digite uma anotação')
      return
    }

    setSalvandoAnotacao(true)
    try {
      const { error } = await supabase
        .from('atividades')
        .insert({
          contato_id: showAnotacaoModal.id,
          contato_nome: showAnotacaoModal.nome,
          equipe_id: user.equipeId,
          tipo: 'anotacao',
          descricao: `📝 Anotação: ${anotacaoTexto.trim()}`,
          criado_por: user.uid,
          criado_em: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Anotação adicionada!')
      setShowAnotacaoModal(null)
      setAnotacaoTexto('')
      carregarAtividades(showAnotacaoModal.id)
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao salvar anotação')
    } finally {
      setSalvandoAnotacao(false)
    }
  }

  // ============================================
  // VALOR FECHADO E COMISSÃO
  // ============================================

  const salvarValorFechado = async (contatoId, valor) => {
    try {
      const { error } = await supabase
        .from('contatos')
        .update({ valor_fechado: valor ? parseFloat(valor) : null })
        .eq('id', contatoId)

      if (error) throw error

      toast.success('Valor fechado atualizado!')
      setEditandoValor(false)
      carregarContatos()
      if (selectedContato?.id === contatoId) {
        setSelectedContato(prev => ({ ...prev, valor_fechado: valor ? parseFloat(valor) : null }))
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao salvar valor')
    }
  }

  const salvarComissao = async (contatoId, comissao) => {
    try {
      const { error } = await supabase
        .from('contatos')
        .update({ comissao_percentual: comissao ? parseFloat(comissao) : null })
        .eq('id', contatoId)

      if (error) throw error

      toast.success('Comissão atualizada!')
      setEditandoComissao(false)
      carregarContatos()
      if (selectedContato?.id === contatoId) {
        setSelectedContato(prev => ({ ...prev, comissao_percentual: comissao ? parseFloat(comissao) : null }))
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao salvar comissão')
    }
  }

  // ============================================
  // HISTÓRICO DE IMPORTAÇÕES
  // ============================================

  const carregarImportacoes = async () => {
    if (!user?.equipeId) return
    
    setLoadingImportacoes(true)
    const { data } = await supabase
      .from('importacoes_historico')
      .select('*')
      .eq('equipe_id', user.equipeId)
      .order('data_importacao', { ascending: false })
    
    setImportacoes(data || [])
    setLoadingImportacoes(false)
  }

  const abrirHistorico = async () => {
    setShowHistorico(true)
    await carregarImportacoes()
  }

  const desfazerImportacao = async (importacao) => {
    if (!confirm(`Tem certeza que deseja desfazer a importação "${importacao.nome_arquivo}" com ${importacao.total_contatos} contatos? Os contatos serão movidos para a lixeira.`)) {
      return
    }

    setDesfazendo(true)
    try {
      const { data, error } = await supabase.rpc('desfazer_importacao', {
        importacao_id_param: importacao.id,
        deletado_por_param: user.uid
      })

      if (error) throw error

      if (data?.sucesso) {
        toast.success(data.mensagem)
        await carregarImportacoes()
        await carregarUltimaImportacao()
        await carregarContatos()
      } else {
        toast.error(data?.mensagem || 'Erro ao desfazer importação')
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao desfazer importação')
    } finally {
      setDesfazendo(false)
    }
  }

  // ============================================
  // LIXEIRA
  // ============================================

  const carregarLixeira = async () => {
    if (!user?.equipeId) return
    
    setLoadingDeletados(true)
    const { data } = await supabase
      .from('contatos')
      .select('*')
      .eq('equipe_id', user.equipeId)
      .not('deletado_em', 'is', null)
      .order('deletado_em', { ascending: false })
    
    setContatosDeletados(data || [])
    setLoadingDeletados(false)
  }

  const abrirLixeira = async () => {
    setShowLixeira(true)
    await carregarLixeira()
  }

  const restaurarContato = async (contatoId) => {
    try {
      const { data, error } = await supabase.rpc('restaurar_contatos', {
        contatos_ids_param: [contatoId]
      })

      if (error) throw error

      if (data?.sucesso) {
        toast.success(data.mensagem)
        await carregarLixeira()
        await carregarContatos()
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao restaurar contato')
    }
  }

  const restaurarTodos = async () => {
    if (!confirm('Tem certeza que deseja restaurar todos os contatos da lixeira?')) return
    
    const ids = contatosDeletados.map(c => c.id)
    try {
      const { data, error } = await supabase.rpc('restaurar_contatos', {
        contatos_ids_param: ids
      })

      if (error) throw error

      if (data?.sucesso) {
        toast.success(data.mensagem)
        await carregarLixeira()
        await carregarContatos()
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao restaurar contatos')
    }
  }

  // ============================================
  // CRIAR LISTA
  // ============================================

  const criarLista = async () => {
    if (!novaListaNome.trim()) {
      toast.error('Digite um nome para a lista')
      return
    }

    setCriandoLista(true)
    const { data, error } = await supabase
      .from('listas')
      .insert({
        nome: novaListaNome.trim(),
        equipe_id: user.equipeId,
        criado_por: user.uid,
        descricao: `Lista criada em ${new Date().toLocaleDateString('pt-BR')}`
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar lista')
      console.error(error)
    } else {
      toast.success('Lista criada!')
      setNovaListaNome('')
      setListaSelecionada(data.id)
      await carregarListas()
      setShowListas(false)
      carregarContatos()
    }
    setCriandoLista(false)
  }

  const deletarLista = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta lista? Os contatos não serão deletados.')) return
    
    const { error } = await supabase
      .from('listas')
      .delete()
      .eq('id', id)
      .eq('equipe_id', user.equipeId)

    if (error) {
      toast.error('Erro ao deletar lista')
    } else {
      toast.success('Lista deletada!')
      if (listaSelecionada === id) {
        setListaSelecionada(null)
      }
      await carregarListas()
      carregarContatos()
    }
  }

  // ============================================
  // IMPORTAR CSV
  // ============================================

  const handleImportarCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo .csv')
      return
    }

    setShowImportModal(true)
    setListaParaImportar(null)
    setNovaListaImport('')
    fileInputRef.current.value = ''
  }

  const processarCSV = async (file) => {
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

        const cabecalho = linhas[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
        
        const mapeamento = {
          'nome': 'nome',
          'name': 'nome',
          'instagram': 'instagram',
          'etapa': 'etapa',
          'classificação': 'classificacao',
          'classificacao': 'classificacao',
          'whatsapp': 'telefone',
          'phone': 'telefone',
          'celular': 'telefone',
          'telefone': 'telefone',
          'formulário': 'formulario',
          'formulario': 'formulario',
          'calendy': 'calendy',
          'faturamento': 'faturamento',
          'dor': 'dor',
          'data': 'data',
          'sdr': 'sdr',
          'empresa': 'empresa',
          'company': 'empresa',
          'email': 'email',
          'e-mail': 'email',
          'status': 'status'
        }

        const contatosJson = []

        for (let i = 1; i < linhas.length; i++) {
          const valores = linhas[i].split(',').map(v => v.trim().replace(/"/g, ''))
          
          if (valores.length === 0 || (valores.length === 1 && !valores[0])) continue

          const contato = {
            nome: '',
            telefone: null,
            email: null,
            empresa: null,
            instagram: null,
            faturamento: null,
            status: 'nao_abordado',
            tag: 'csv_import',
            anotacoes: [],
            historico_interacoes: [],
            dados_extras: {}
          }

          cabecalho.forEach((col, index) => {
            const valor = valores[index] || ''
            const campo = mapeamento[col]

            if (!campo) {
              contato.dados_extras[col] = valor
              return
            }

            if (campo === 'nome') {
              contato.nome = valor
            } else if (campo === 'telefone') {
              let telefone = valor
                .replace(/\+55/g, '')
                .replace(/[\(\)\-\s]/g, '')
                .replace(/^0+/, '')
              if (telefone) contato.telefone = telefone
            } else if (campo === 'email') {
              if (valor.includes('@')) contato.email = valor
            } else if (campo === 'empresa') {
              contato.empresa = valor
            } else if (campo === 'instagram') {
              if (valor && !valor.includes('@')) {
                contato.instagram = '@' + valor
              } else if (valor) {
                contato.instagram = valor
              }
            } else if (campo === 'faturamento') {
              if (valor && !valor.toLowerCase().includes('nao')) {
                contato.faturamento = valor
              }
            } else if (campo === 'status') {
              const statusMap = {
                'rup confirmacao': 'respondeu',
                'proposta enviada': 'proposta',
                'fechamento futuro': 'fechou',
                'cadência 02': 'abordado',
                'cadência 03': 'abordado',
                'cadência 04': 'abordado',
                'cadência 55': 'abordado',
                'cancelou': 'perdeu',
                'no show': 'perdeu',
                'periodo': 'nao_abordado',
                'perido': 'nao_abordado',
                'gorho': 'abordado',
                'sql': 'respondeu',
                'sq': 'respondeu',
                'sq i': 'respondeu',
                'mol': 'abordado',
                's2c': 'respondeu',
                'desqualificado': 'perdeu'
              }
              const statusLower = valor.toLowerCase()
              contato.status = statusMap[statusLower] || 'nao_abordado'
            } else if (campo === 'etapa') {
              contato.dados_extras.etapa = valor
            } else if (campo === 'classificacao') {
              contato.dados_extras.classificacao = valor
            } else if (campo === 'formulario') {
              contato.dados_extras.formulario = valor
            } else if (campo === 'calendy') {
              contato.dados_extras.calendy = valor
            } else if (campo === 'dor') {
              contato.dados_extras.dor = valor
            } else if (campo === 'sdr') {
              contato.dados_extras.sdr = valor
            } else if (campo === 'data') {
              contato.dados_extras.data = valor
            }
          })

          if (!contato.nome || !contato.nome.trim()) {
            console.warn(`Linha ${i + 1}: nome é obrigatório`)
            continue
          }

          contato.nome = contato.nome.trim()
          contatosJson.push(contato)
        }

        if (contatosJson.length === 0) {
          toast.error('Nenhum contato válido encontrado no arquivo')
          setImportando(false)
          return
        }

        const lotes = []
        const tamanhoLote = 500
        for (let i = 0; i < contatosJson.length; i += tamanhoLote) {
          lotes.push(contatosJson.slice(i, i + tamanhoLote))
        }

        let totalInseridos = 0
        let todosErros = []

        for (let loteIndex = 0; loteIndex < lotes.length; loteIndex++) {
          const lote = lotes[loteIndex]
          const { data, error } = await supabase.rpc('importar_contatos_com_lista', {
            dados_json: lote,
            equipe_id_param: user.equipeId,
            criado_por_param: user.uid,
            nome_arquivo_param: file.name,
            lista_id_param: listaParaImportar
          })

          if (error) {
            console.error('Erro na importação do lote:', error)
            todosErros.push(`Lote ${loteIndex + 1}: ${error.message}`)
          } else {
            if (data?.inseridos > 0) {
              totalInseridos += data.inseridos
            }
            if (data?.erros && data.erros.length > 0) {
              todosErros = todosErros.concat(data.erros)
            }
          }

          toast.loading(`Importando... ${Math.round(((loteIndex + 1) / lotes.length) * 100)}%`, { duration: 1000 })
        }

        if (totalInseridos > 0) {
          toast.success(`${totalInseridos} contato(s) importado(s) com sucesso!`)
          setShowImportModal(false)
          setListaParaImportar(null)
          setNovaListaImport('')
          await carregarContatos()
          await carregarListas()
          await carregarUltimaImportacao()
        }

        if (todosErros.length > 0) {
          console.warn('Erros na importação:', todosErros)
          toast.error(`${todosErros.length} erro(s) encontrados. Verifique o console.`)
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

  // ============================================
  // CRIAR LISTA NA IMPORTAÇÃO
  // ============================================

  const criarListaImport = async () => {
    if (!novaListaImport.trim()) {
      toast.error('Digite um nome para a lista')
      return
    }

    setCriandoListaImport(true)
    const { data, error } = await supabase
      .from('listas')
      .insert({
        nome: novaListaImport.trim(),
        equipe_id: user.equipeId,
        criado_por: user.uid,
        descricao: `Lista criada em ${new Date().toLocaleDateString('pt-BR')}`
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar lista')
      console.error(error)
    } else {
      toast.success('Lista criada!')
      setListaParaImportar(data.id)
      setNovaListaImport('')
      await carregarListas()
      const file = fileInputRef.current?.files?.[0]
      if (file) {
        await processarCSV(file)
      }
    }
    setCriandoListaImport(false)
  }

  // ============================================
  // EXPORTAR PDF
  // ============================================

  const exportarPDF = () => {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const sistemaNome = user?.equipe?.nome_sistema || 'PARHUB CRM'
    
    doc.setFontSize(16)
    doc.text(sistemaNome, 14, 18)
    doc.setFontSize(11)
    doc.text('Relatório de Contatos', 14, 26)
    doc.setFontSize(9)
    const listaNome = listas.find(l => l.id === listaSelecionada)?.nome || 'Todos os contatos'
    doc.text(`Lista: ${listaNome} | Gerado em: ${dataAtual} | Total: ${contatosFiltrados.length} contatos`, 14, 32)
    
    const colunas = [
      'Nome', 
      ...(isAdmin ? ['Dono'] : []), 
      'Telefone', 
      'Email', 
      'Empresa', 
      'Follow-ups',
      'Respostas',
      'Valor Fechado',
      'Comissão',
      ...camposPersonalizados.map(c => c.nome), 
      'Status'
    ]
    
    const linhas = contatosFiltrados.map(c => [
      c.nome || '-',
      ...(isAdmin ? [(c.criado_por === user.uid ? 'Você' : getMembroNome(c.criado_por) || '-')] : []),
      c.telefone ? formatPhone(c.telefone) : '-',
      c.email || '-',
      c.empresa || '-',
      c.total_follow_ups || 0,
      c.total_respostas || 0,
      c.valor_fechado ? `R$ ${c.valor_fechado}` : '-',
      c.comissao_percentual ? `${c.comissao_percentual}%` : '-',
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
    
    doc.save(`contatos-${listaNome}-${dataAtual.replace(/\//g, '-')}.pdf`)
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

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

  const getIconesContato = (contato) => {
    const icones = []
    
    if (contato.ultimo_follow_up) {
      icones.push({ 
        tipo: 'follow_up', 
        data: contato.ultimo_follow_up,
        total: contato.total_follow_ups || 0,
        icone: '📅'
      })
    }
    
    if (contato.ultima_resposta) {
      icones.push({ 
        tipo: 'resposta', 
        data: contato.ultima_resposta,
        total: contato.total_respostas || 0,
        icone: '✅'
      })
    }
    
    if (contato.ultimo_follow_up) {
      const dias = Math.floor((new Date() - new Date(contato.ultimo_follow_up)) / (1000 * 60 * 60 * 24))
      if (dias > 3) {
        icones.push({ 
          tipo: 'atrasado', 
          data: contato.ultimo_follow_up,
          dias: dias,
          icone: '⚠️'
        })
      }
    }
    
    return icones
  }

  const formatarDataHora = (data) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* ============================================
      HEADER
      ============================================ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
              ? `${contatosFiltrados.length} de ${contatos.length} contatos`
              : `${contatosFiltrados.length} de ${contatos.length} contatos`
            }
            {listaSelecionada && (
              <span className="ml-2 px-2 py-0.5 bg-brand-500/10 text-brand-500 rounded-full text-xs">
                {listas.find(l => l.id === listaSelecionada)?.nome}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ultimaImportacao && (
            <button 
              onClick={() => desfazerImportacao(ultimaImportacao)}
              disabled={desfazendo}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all text-sm ${desfazendo ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Undo2 size={16} /> 
              {desfazendo ? 'Desfazendo...' : `Desfazer (${ultimaImportacao.total_contatos})`}
            </button>
          )}
          <button 
            onClick={abrirHistorico}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all text-sm"
          >
            <ClockIcon size={16} /> Histórico
          </button>
          <button 
            onClick={abrirLixeira}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm"
          >
            <Trash2 size={16} /> Lixeira
          </button>
          <button 
            onClick={() => setShowListas(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all text-sm"
          >
            <List size={16} /> Listas
          </button>
          <button 
            onClick={() => {
              setNovoContato({ 
                nome: '', 
                telefone: '', 
                email: '', 
                empresa: '', 
                instagram: '', 
                linkedin: '', 
                faturamento: '', 
                nicho: '', 
                tempoMercado: '' 
              })
              const extrasIniciais = {}
              camposPersonalizados.forEach(campo => {
                extrasIniciais[campo.nome] = ''
              })
              setDadosExtras(extrasIniciais)
              setShowNovo(true)
            }} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-all text-sm"
          >
            <Plus size={16} /> Novo Contato
          </button>
          <button 
            onClick={exportarPDF} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all text-sm"
          >
            <FileText size={16} /> Exportar PDF
          </button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".csv" 
            onChange={handleImportarCSV} 
            className="hidden" 
            id="csv-upload" 
          />
          <label 
            htmlFor="csv-upload" 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all text-sm cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload size={16} /> {importando ? 'Importando...' : 'Importar CSV'}
          </label>
        </div>
      </div>

      {/* ============================================
      MODAL DE IMPORTAÇÃO - ESCOLHER LISTA
      ============================================ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Upload size={20} className="text-blue-500" />
                Importar Contatos
              </h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">Selecione ou crie uma lista para importar os contatos:</p>

              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoLista"
                    value="nova"
                    checked={listaParaImportar === 'nova'}
                    onChange={() => {
                      setListaParaImportar('nova')
                      setNovaListaImport('')
                    }}
                    className="w-4 h-4 text-brand-500"
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Criar nova lista</span>
                </label>
                {listaParaImportar === 'nova' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da nova lista..."
                      value={novaListaImport}
                      onChange={(e) => setNovaListaImport(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm"
                      autoFocus
                    />
                    <button
                      onClick={criarListaImport}
                      disabled={criandoListaImport || !novaListaImport.trim()}
                      className="px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 text-sm disabled:opacity-50"
                    >
                      {criandoListaImport ? 'Criando...' : 'Criar'}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoLista"
                    value="existente"
                    checked={listaParaImportar !== 'nova' && listaParaImportar !== null}
                    onChange={() => setListaParaImportar(listas[0]?.id || null)}
                    className="w-4 h-4 text-brand-500"
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Importar para lista existente</span>
                </label>
                {listaParaImportar !== 'nova' && (
                  <div className="mt-2">
                    <select
                      value={listaParaImportar || ''}
                      onChange={(e) => setListaParaImportar(e.target.value || null)}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm"
                    >
                      <option value="">Selecione uma lista...</option>
                      {listas.map(lista => (
                        <option key={lista.id} value={lista.id}>
                          {lista.nome} ({lista.contatos_count || 0} contatos)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const file = fileInputRef.current?.files?.[0]
                    if (!file) {
                      toast.error('Selecione um arquivo CSV')
                      return
                    }
                    if (!listaParaImportar || listaParaImportar === 'nova') {
                      toast.error('Selecione ou crie uma lista')
                      return
                    }
                    setShowImportModal(false)
                    processarCSV(file)
                  }}
                  className="flex-1 btn-primary text-sm"
                >
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE HISTÓRICO
      ============================================ */}
      {showHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHistorico(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-3xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <ClockIcon size={20} className="text-amber-500" />
                Histórico de Importações
              </h2>
              <button onClick={() => setShowHistorico(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            {loadingImportacoes ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : importacoes.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhuma importação encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importacoes.map((imp) => (
                  <div
                    key={imp.id}
                    className={`p-4 rounded-lg border ${
                      imp.status === 'revertida'
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-[var(--border-color)] hover:border-brand-500/30'
                    } transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-brand-500" />
                          <span className="font-medium text-[var(--text-primary)]">
                            {imp.nome_arquivo}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            imp.status === 'concluida'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {imp.status === 'concluida' ? '✅ Concluída' : '❌ Revertida'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatarDataHora(imp.data_importacao)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {imp.total_contatos} contatos
                          </span>
                          {imp.criado_por === user.uid && (
                            <span className="text-xs text-brand-500">(por você)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {imp.status === 'concluida' && (
                          <button
                            onClick={() => desfazerImportacao(imp)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Desfazer importação"
                          >
                            <Undo2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE LIXEIRA
      ============================================ */}
      {showLixeira && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLixeira(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-3xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Trash2 size={20} className="text-red-500" />
                Lixeira ({contatosDeletados.length} contatos)
              </h2>
              <button onClick={() => setShowLixeira(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            {contatosDeletados.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={restaurarTodos}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm"
                >
                  Restaurar Todos
                </button>
              </div>
            )}

            {loadingDeletados ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : contatosDeletados.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>Lixeira vazia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contatosDeletados.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{c.nome}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {c.telefone || 'Sem telefone'} • {c.empresa || 'Sem empresa'}
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Excluído em: {formatarDataHora(c.deletado_em)} • {c.motivo_delecao || 'Sem motivo'}
                      </p>
                    </div>
                    <button
                      onClick={() => restaurarContato(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 text-xs"
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE FOLLOW-UP
      ============================================ */}
      {showFollowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFollowModal(null)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Calendar size={20} className="text-brand-500" />
                Registrar Follow-up
              </h2>
              <button onClick={() => setShowFollowModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">Contato</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{showFollowModal.nome}</p>
              </div>

              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">Data e Hora</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatarDataHora(new Date())}
                </p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">
                  Anotações (opcional)
                </label>
                <textarea
                  value={anotacoesFollow}
                  onChange={(e) => setAnotacoesFollow(e.target.value)}
                  placeholder="Digite suas anotações sobre este follow-up..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm resize-none h-24 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowFollowModal(null)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarFollowUp}
                  disabled={salvandoFollow}
                  className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {salvandoFollow ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Calendar size={16} />
                      Registrar Follow-up
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE RESPOSTA
      ============================================ */}
      {showRespostaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRespostaModal(null)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <CheckCircle size={20} className="text-green-500" />
                Registrar Resposta
              </h2>
              <button onClick={() => setShowRespostaModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">Contato</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{showRespostaModal.nome}</p>
              </div>

              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">Data e Hora</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatarDataHora(new Date())}
                </p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">
                  Anotações (opcional)
                </label>
                <textarea
                  value={anotacoesResposta}
                  onChange={(e) => setAnotacoesResposta(e.target.value)}
                  placeholder="Digite suas anotações sobre esta resposta..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm resize-none h-24 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowRespostaModal(null)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarResposta}
                  disabled={salvandoResposta}
                  className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  {salvandoResposta ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Registrar Resposta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE ANOTAÇÃO
      ============================================ */}
      {showAnotacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAnotacaoModal(null)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Pencil size={20} className="text-amber-500" />
                Adicionar Anotação
              </h2>
              <button onClick={() => setShowAnotacaoModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">Contato</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{showAnotacaoModal.nome}</p>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">
                  Anotação *
                </label>
                <textarea
                  value={anotacaoTexto}
                  onChange={(e) => setAnotacaoTexto(e.target.value)}
                  placeholder="Digite sua anotação..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm resize-none h-32 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAnotacaoModal(null)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarAnotacao}
                  disabled={salvandoAnotacao || !anotacaoTexto.trim()}
                  className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {salvandoAnotacao ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Anotação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      MODAL DE LISTAS
      ============================================ */}
      {showListas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowListas(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <List size={20} /> Gerenciar Listas
              </h2>
              <button onClick={() => setShowListas(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova lista..."
                  value={novaListaNome}
                  onChange={(e) => setNovaListaNome(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && criarLista()}
                />
                <button
                  onClick={criarLista}
                  disabled={criandoLista}
                  className="px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 text-sm disabled:opacity-50"
                >
                  <FolderPlus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setListaSelecionada(null)
                  setShowListas(false)
                  carregarContatos()
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  !listaSelecionada ? 'bg-brand-500/10 border-2 border-brand-500' : 'hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <span className="text-sm font-medium">Todos os contatos</span>
                {!listaSelecionada && <Check size={16} className="text-brand-500" />}
              </button>

              {listas.map(lista => (
                <div
                  key={lista.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    listaSelecionada === lista.id ? 'bg-brand-500/10 border-2 border-brand-500' : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setListaSelecionada(lista.id)
                      setShowListas(false)
                      carregarContatos()
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{lista.nome}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        ({lista.contatos_count || 0} contatos)
                      </span>
                    </div>
                    {lista.descricao && (
                      <p className="text-xs text-[var(--text-secondary)] truncate">{lista.descricao}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    {listaSelecionada === lista.id && (
                      <Check size={16} className="text-brand-500" />
                    )}
                    <button
                      onClick={() => deletarLista(lista.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {listas.length === 0 && (
                <p className="text-center text-sm text-[var(--text-secondary)] py-4">
                  Nenhuma lista criada ainda.
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-secondary)]">
                Ao importar um CSV, os contatos serão adicionados à lista selecionada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      MODAL NOVO CONTATO
      ============================================ */}
      {showNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNovo(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Novo Contato</h2>
              <button onClick={() => setShowNovo(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X size={20} />
              </button>
            </div>
            {listaSelecionada && (
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Adicionando à lista: <span className="text-brand-500 font-medium">
                  {listas.find(l => l.id === listaSelecionada)?.nome}
                </span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Nome *</label>
                <input 
                  type="text" 
                  value={novoContato.nome} 
                  onChange={e => setNovoContato({...novoContato, nome: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Telefone</label>
                <input 
                  type="text" 
                  value={novoContato.telefone} 
                  onChange={e => setNovoContato({...novoContato, telefone: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm font-mono" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Email</label>
                <input 
                  type="email" 
                  value={novoContato.email} 
                  onChange={e => setNovoContato({...novoContato, email: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Empresa</label>
                <input 
                  type="text" 
                  value={novoContato.empresa} 
                  onChange={e => setNovoContato({...novoContato, empresa: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                  <Instagram size={12} className="inline" /> Instagram
                </label>
                <input 
                  type="text" 
                  value={novoContato.instagram} 
                  onChange={e => setNovoContato({...novoContato, instagram: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                  <Linkedin size={12} className="inline" /> LinkedIn
                </label>
                <input 
                  type="text" 
                  value={novoContato.linkedin} 
                  onChange={e => setNovoContato({...novoContato, linkedin: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Faturamento</label>
                <input 
                  type="text" 
                  value={novoContato.faturamento} 
                  onChange={e => setNovoContato({...novoContato, faturamento: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Nicho</label>
                <input 
                  type="text" 
                  value={novoContato.nicho} 
                  onChange={e => setNovoContato({...novoContato, nicho: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Tempo de Mercado</label>
                <input 
                  type="text" 
                  value={novoContato.tempoMercado} 
                  onChange={e => setNovoContato({...novoContato, tempoMercado: e.target.value})} 
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
                />
              </div>
              
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
              <button 
                onClick={() => setShowNovo(false)} 
                className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvar} 
                disabled={salvando || !novoContato.nome.trim()} 
                className="flex-1 btn-primary text-sm disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
      FILTROS
      ============================================ */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone, email ou empresa..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm" 
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isAdmin && membrosEquipe.length > 0 && (
            <select 
              value={filtroMembro} 
              onChange={e => setFiltroMembro(e.target.value)} 
              className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm"
            >
              <option value="todos">Todos os membros</option>
              {membrosEquipe.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          )}
          <select 
            value={ordenacao} 
            onChange={e => setOrdenacao(e.target.value)} 
            className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm"
          >
            <option value="nome">Nome A-Z</option>
            <option value="nome_desc">Nome Z-A</option>
            <option value="data">Mais recentes</option>
            <option value="data_antiga">Mais antigos</option>
            <option value="status">Por status</option>
          </select>
        </div>
      </div>

      {/* ============================================
      TABELA DE CONTATOS
      ============================================ */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : contatos.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={28} className="mx-auto mb-3 text-[var(--text-secondary)]" />
            <p className="text-sm">Nenhum contato nesta lista.</p>
            {listaSelecionada && (
              <button 
                onClick={() => setShowListas(true)}
                className="mt-2 text-xs text-brand-500 hover:underline"
              >
                Mudar de lista ou importar contatos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Nome</th>
                  {isAdmin && <th className="text-left p-3 text-[10px] font-medium uppercase">Dono</th>}
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Telefone</th>
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Email</th>
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Empresa</th>
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Follow-ups</th>
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Status</th>
                  <th className="text-left p-3 text-[10px] font-medium uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatosFiltrados.map(c => {
                  const icones = getIconesContato(c)
                  const diasSemFollow = c.ultimo_follow_up ? Math.floor((new Date() - new Date(c.ultimo_follow_up)) / (1000 * 60 * 60 * 24)) : null
                  
                  return (
                    <tr key={c.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* Ícones na frente do nome */}
                          {icones.map((icon, idx) => (
                            <span
                              key={idx}
                              className="text-sm cursor-help"
                              title={
                                icon.tipo === 'follow_up' 
                                  ? `📅 Último follow-up: ${formatarDataHora(icon.data)} (${icon.total} total)`
                                  : icon.tipo === 'resposta'
                                  ? `✅ Respondeu em: ${formatarDataHora(icon.data)} (${icon.total} total)`
                                  : `⚠️ ${icon.dias} dias sem follow-up (último: ${formatarDataHora(icon.data)})`
                              }
                            >
                              {icon.icone}
                            </span>
                          ))}
                          
                          <button 
                            onClick={() => { 
                              setSelectedContato(c)
                              setShowPainel(true)
                              carregarAtividades(c.id)
                            }} 
                            className="text-left hover:text-brand-500 text-sm font-medium"
                          >
                            {c.nome}
                          </button>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-xs text-[var(--text-secondary)]">
                          {c.criado_por === user.uid ? 'Você' : getMembroNome(c.criado_por) || '-'}
                        </td>
                      )}
                      <td className="p-3 text-sm font-mono">{c.telefone ? formatPhone(c.telefone) : '-'}</td>
                      <td className="p-3 text-xs">{c.email || '-'}</td>
                      <td className="p-3 text-xs">{c.empresa || '-'}</td>
                      <td className="p-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{c.total_follow_ups || 0}</span>
                          {c.ultimo_follow_up && (
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {formatarDataHora(c.ultimo_follow_up).slice(0, 10)}
                            </span>
                          )}
                          {diasSemFollow !== null && diasSemFollow > 3 && (
                            <span className="text-red-500 text-xs font-medium" title={`${diasSemFollow} dias sem follow-up`}>
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <select 
                          value={c.status} 
                          onChange={e => atualizarStatus(c.id, e.target.value)} 
                          className="text-xs px-2 py-1 rounded-full border bg-[var(--bg-tertiary)]"
                        >
                          {statusOptions.filter(s => s.value !== 'todos').map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFollowUp(c)}
                            className="p-1.5 rounded hover:bg-brand-500/10 text-brand-500 transition-colors"
                            title="Registrar Follow-up"
                          >
                            <Calendar size={15} />
                          </button>
                          <button
                            onClick={() => handleResposta(c)}
                            className="p-1.5 rounded hover:bg-green-500/10 text-green-500 transition-colors"
                            title="Registrar Resposta"
                          >
                            <CheckCircle size={15} />
                          </button>
                          {c.telefone && (
                            <a
                              href={whatsappLink(c)}
                              target="_blank"
                              className="p-1.5 rounded hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================
      PAINEL LATERAL DE DETALHES
      ============================================ */}
      {showPainel && selectedContato && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => { 
            setShowPainel(false)
            setSelectedContato(null)
          }} />
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
                <button onClick={() => { 
                  setShowPainel(false)
                  setSelectedContato(null)
                }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X size={20} />
                </button>
              </div>
              
              {/* Informações do Contato */}
              <div className="space-y-3 mb-6">
                {selectedContato.telefone && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Phone size={14} className="inline mr-2" />
                    {formatPhone(selectedContato.telefone)}
                  </p>
                )}
                {selectedContato.email && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Mail size={14} className="inline mr-2" />
                    {selectedContato.email}
                  </p>
                )}
                {selectedContato.empresa && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Building2 size={14} className="inline mr-2" />
                    {selectedContato.empresa}
                  </p>
                )}
                {selectedContato.instagram && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Instagram size={14} className="inline mr-2" />
                    {selectedContato.instagram}
                  </p>
                )}
                {selectedContato.faturamento && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <DollarSign size={14} className="inline mr-2" />
                    Faturamento: {selectedContato.faturamento}
                  </p>
                )}
                {selectedContato.nicho && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Tag size={14} className="inline mr-2" />
                    Nicho: {selectedContato.nicho}
                  </p>
                )}
                
                {camposPersonalizados.map((campo, i) => (
                  selectedContato.dados_extras?.[campo.nome] && (
                    <p key={i} className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium">{campo.nome}:</span> {selectedContato.dados_extras[campo.nome]}
                    </p>
                  )
                ))}
              </div>

              {/* Valor Fechado e Comissão */}
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Valor Fechado */}
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">💰 Valor Fechado</label>
                    {editandoValor ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={selectedContato.valor_fechado || ''}
                          className="flex-1 px-2 py-1 bg-[var(--bg-secondary)] rounded text-sm"
                          id="valorFechadoInput"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('valorFechadoInput')
                            salvarValorFechado(selectedContato.id, input?.value)
                          }}
                          className="px-2 py-1 rounded bg-brand-500 text-white text-xs"
                        >
                          <Save size={12} />
                        </button>
                        <button
                          onClick={() => setEditandoValor(false)}
                          className="px-2 py-1 rounded border border-[var(--border-color)] text-xs"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedContato.valor_fechado ? `R$ ${selectedContato.valor_fechado}` : '-'}
                        </span>
                        <button
                          onClick={() => setEditandoValor(true)}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comissão */}
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">📊 Comissão (retirar)</label>
                    {editandoComissao ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={selectedContato.comissao_percentual || ''}
                          className="flex-1 px-2 py-1 bg-[var(--bg-secondary)] rounded text-sm"
                          id="comissaoInput"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('comissaoInput')
                            salvarComissao(selectedContato.id, input?.value)
                          }}
                          className="px-2 py-1 rounded bg-brand-500 text-white text-xs"
                        >
                          <Save size={12} />
                        </button>
                        <button
                          onClick={() => setEditandoComissao(false)}
                          className="px-2 py-1 rounded border border-[var(--border-color)] text-xs"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedContato.comissao_percentual ? `${selectedContato.comissao_percentual}%` : '-'}
                        </span>
                        <button
                          onClick={() => setEditandoComissao(true)}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Respostas e Follow-ups */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
                  <p className="text-xs text-[var(--text-secondary)]">💬 Respostas</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{selectedContato.total_respostas || 0}</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
                  <p className="text-xs text-[var(--text-secondary)]">📅 Follow-ups</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{selectedContato.total_follow_ups || 0}</p>
                </div>
              </div>

              {/* Botões rápidos no painel */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => {
                    setShowPainel(false)
                    handleFollowUp(selectedContato)
                  }}
                  className="flex-1 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 text-sm flex items-center justify-center gap-2"
                >
                  <Calendar size={14} /> Follow-up
                </button>
                <button
                  onClick={() => {
                    setShowPainel(false)
                    handleResposta(selectedContato)
                  }}
                  className="flex-1 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} /> Resposta
                </button>
                <button
                  onClick={() => handleAdicionarAnotacao(selectedContato)}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm flex items-center justify-center gap-2"
                >
                  <Pencil size={14} /> Anotação
                </button>
                {selectedContato.telefone && (
                  <a
                    href={whatsappLink(selectedContato)}
                    target="_blank"
                    className="py-2 px-4 rounded-lg bg-[#25D366] text-white hover:bg-[#1ea952] text-sm flex items-center gap-2"
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
              </div>

              {/* Histórico de Atividades */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <History size={16} /> Histórico de Atividades
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">{atividades.length} registros</span>
              </div>
              
              {carregandoAtividades ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : atividades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade registrada</p>
                  <button
                    onClick={() => handleAdicionarAnotacao(selectedContato)}
                    className="mt-2 text-xs text-brand-500 hover:underline"
                  >
                    Adicionar primeira anotação
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {atividades.map(a => (
                    <div key={a.id} className="flex gap-3 p-2 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-primary)]">{a.descricao}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {formatarDataHora(a.criado_em)}
                          {a.criado_por === user.uid && (
                            <span className="ml-2 text-brand-500">(você)</span>
                          )}
                        </p>
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