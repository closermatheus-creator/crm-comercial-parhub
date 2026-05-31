import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MessageCircle, Clock, AlertTriangle, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react'
import { DndContext, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core'
import toast from 'react-hot-toast'

const colunas = [
  { id: 'nao_abordado', titulo: 'Não Abordado', cor: 'bg-slate-500' },
  { id: 'abordado', titulo: 'Abordado', cor: 'bg-blue-500' },
  { id: 'respondeu', titulo: 'Respondeu', cor: 'bg-brand-500' },
  { id: 'reuniao', titulo: 'Reunião', cor: 'bg-amber-500' },
  { id: 'proposta', titulo: 'Proposta', cor: 'bg-cyan-500' },
  { id: 'fechou', titulo: 'Fechou', cor: 'bg-green-500' },
  { id: 'perdeu', titulo: 'Perdeu', cor: 'bg-red-500' },
]

function DraggableCard({ contato, onStatusChange, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contato.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 100 : 1 } : {}

  const dias = contato.ultimo_contato ? Math.floor((new Date() - new Date(contato.ultimo_contato)) / 86400000) : '?'
  const urgente = typeof dias === 'number' && dias > 2 && contato.status !== 'fechou' && contato.status !== 'perdeu'

  return (
    <div ref={setNodeRef} style={style} className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:border-brand-500/40 transition-all shadow-sm">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-[var(--text-secondary)] hover:text-brand-400 mt-0.5">
            <GripVertical size={14} />
          </button>
          
          <div className="flex-1 min-w-0">
            {/* Tag do Facebook Ads adicionada logo acima do nome */}
            {contato.tag === 'facebook_ads' && (
              <div className="text-[10px] font-semibold text-purple-600 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 rounded px-1.5 py-0.5 w-fit mb-1">
                🔵 Facebook Lead
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {contato.nome?.split(' ').slice(0, 2).join(' ')}
              </p>
              
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1">
                  ⋮
                </button>
                
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-1 z-50 min-w-[150px]">
                      <button 
                        onClick={() => {
                          onDelete(contato.id)
                          setMenuOpen(false)
                        }} 
                        className="flex items-center gap-2 text-red-500 hover:bg-red-500/10 w-full text-left px-3 py-1.5 text-xs rounded"
                      >
                        <Trash2 size={12} /> Excluir Contato
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Informações Extras de Faturamento e Nicho Corrigidas */}
            {(contato.faturamento || contato.nicho || contato.dados_extras) && (
              <div className="mt-1.5 pt-1.5 border-t border-[var(--border-color)]/40 flex flex-wrap gap-1">
                {contato.faturamento && (
                  <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                    💰 {contato.faturamento}
                  </span>
                )}
                {contato.nicho && (
                  <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                    🎯 {contato.nicho}
                  </span>
                )}
              </div>
            )}

            {/* Alertas de Tempo de Contato */}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span>{dias} dias sem contato</span>
              </div>
              {urgente && (
                <div className="flex items-center gap-0.5 text-amber-500 font-medium animate-pulse">
                  <AlertTriangle size={11} />
                  <span>Urgente</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ coluna, cards, onStatusChange, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })
  return (
    <div ref={setNodeRef} className={`card p-3 min-h-[400px] flex flex-col transition-all ${isOver ? 'border-brand-500 bg-brand-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${coluna.cor}`} />
          <h3 className="text-[11px] font-semibold uppercase">{coluna.titulo}</h3>
        </div>
        <span className="text-[11px] font-mono font-bold bg-[var(--bg-tertiary)] px-2 py-1 rounded-full">{cards.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {cards.map(c => <DraggableCard key={c.id} contato={c} onStatusChange={onStatusChange} onDelete={onDelete} />)}
        {cards.length === 0 && <p className="text-[11px] text-center py-8 text-[var(--text-secondary)] opacity-50">Arraste cards aqui</p>}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const { user } = useAuth()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [user])
  
  const carregar = async () => {
    if (!user?.equipeId) return
    const { data } = await supabase.from('contatos').select('*').eq('equipe_id', user.equipeId)
    setContatos((data || []).map(c => ({ ...c, status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado' })))
    setLoading(false)
  }

  const atualizarStatus = async (id, novoStatus) => {
    try {
      const { data: c } = await supabase.from('contatos').select('status_por_usuario').eq('id', id).single()
      const s = c?.status_por_usuario || {}
      s[user.uid] = novoStatus
      
      // Corrigido para salvar data compatível com Postgres TIMESTAMP
      await supabase.from('contatos').update({ 
        status_por_usuario: s, 
        ultimo_contato: new Date().toISOString() 
      }).eq('id', id)
      
      setContatos(prev => prev.map(c => c.id === id ? { ...c, status: novoStatus } : c))
      toast.success('Status updated!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status')
    }
  }

  const excluir = async (id) => {
    if (!confirm('Deseja realmente excluir este contato?')) return
    await supabase.from('contatos').delete().eq('id', id)
    setContatos(prev => prev.filter(c => c.id !== id))
    toast.success('Excluído!')
  }

  const handleDragEnd = (e) => {
    const { active, over } = e
    if (!over || !colunas.find(c => c.id === over.id)) return
    atualizarStatus(active.id, over.id)
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Pipeline</h1>
        <p className="text-xs text-[var(--text-secondary)]">{contatos.length} contatos</p>
      </div>
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {colunas.map(col => (
            <div key={col.id} className="flex-shrink-0 w-[280px]">
              <DroppableColumn coluna={col} cards={contatos.filter(c => c.status === col.id)} onStatusChange={atualizarStatus} onDelete={excluir} />
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  )
}