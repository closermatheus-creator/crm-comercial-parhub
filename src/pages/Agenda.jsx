import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Clock, CheckCircle, AlertCircle, Plus, Phone, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Agenda() {
  const { user } = useAuth()
  const [contatos, setContatos] = useState([])
  const [showNovo, setShowNovo] = useState(false)
  const [novoLembrete, setNovoLembrete] = useState({ nome: '', telefone: '', horario: '' })

  useEffect(() => { if (user?.equipeId) carregar() }, [user])
  const carregar = async () => {
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('contatos').select('*').eq('equipe_id', user.equipeId).not('proximo_contato', 'is', null)
    setContatos((data || []).filter(c => c.proximo_contato && c.proximo_contato.startsWith(hoje)))
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Agenda</h1><p className="text-sm text-[var(--text-secondary)] capitalize">{hoje}</p></div>
        <button onClick={() => setShowNovo(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} />Novo Lembrete</button>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock size={16} className="text-brand-500" />Programados para Hoje ({contatos.length})</h3>
        {contatos.length === 0 ? <p className="text-sm text-center py-8 text-[var(--text-secondary)]">Nenhum follow-up hoje 🎉</p> : (
          <div className="space-y-2">
            {contatos.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-bold">{c.nome?.charAt(0)}</div>
                  <div><p className="text-sm font-medium">{c.nome}</p><p className="text-xs text-[var(--text-secondary)]">{c.telefone}</p></div>
                </div>
                {c.telefone && (
                  <a href={`https://wa.me/55${c.telefone}`} target="_blank" className="whatsapp-btn text-xs"><Phone size={12} /> Ligar</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}