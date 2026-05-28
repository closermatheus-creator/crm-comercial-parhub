import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, PhoneCall, MessageCircle, Calendar, CheckCircle, TrendingUp, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Overview() {
  const { user } = useAuth()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [user])

  const carregarDados = async () => {
    if (!user?.equipeId) return
    const { data } = await supabase
      .from('contatos')
      .select('*')
      .eq('equipe_id', user.equipeId)
    
    const lista = (data || []).map(c => ({
      ...c,
      status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado'
    }))
    setContatos(lista)
    setLoading(false)
  }

  const stats = {
    total: contatos.length,
    abordadosHoje: contatos.filter(c => c.ultimo_contato && new Date(c.ultimo_contato).toDateString() === new Date().toDateString()).length,
    responderam: contatos.filter(c => ['respondeu', 'reuniao', 'proposta', 'fechou'].includes(c.status)).length,
    taxa: contatos.length > 0 ? ((contatos.filter(c => c.status !== 'nao_abordado' && c.status !== 'abordado').length / contatos.length) * 100).toFixed(1) : 0,
    reunioes: contatos.filter(c => ['reuniao', 'proposta', 'fechou'].includes(c.status)).length,
    fechados: contatos.filter(c => c.status === 'fechou').length,
    perdidos: contatos.filter(c => c.status === 'perdeu').length,
  }

  const kpis = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Abordados Hoje', value: stats.abordadosHoje, icon: PhoneCall, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'Responderam', value: stats.responderam, icon: MessageCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Taxa Resposta', value: `${stats.taxa}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Reuniões', value: stats.reunioes, icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Fechados', value: stats.fechados, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Perdidos', value: stats.perdidos, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  const funil = [
    { label: 'Não Abordado', value: contatos.filter(c => c.status === 'nao_abordado').length, color: 'bg-slate-500' },
    { label: 'Abordado', value: contatos.filter(c => c.status === 'abordado').length, color: 'bg-blue-500' },
    { label: 'Respondeu', value: contatos.filter(c => c.status === 'respondeu').length, color: 'bg-brand-500' },
    { label: 'Reunião', value: contatos.filter(c => c.status === 'reuniao').length, color: 'bg-amber-500' },
    { label: 'Proposta', value: contatos.filter(c => c.status === 'proposta').length, color: 'bg-cyan-500' },
    { label: 'Fechou', value: contatos.filter(c => c.status === 'fechou').length, color: 'bg-green-500' },
    { label: 'Perdeu', value: contatos.filter(c => c.status === 'perdeu').length, color: 'bg-red-500' },
  ]

  const maxFunil = Math.max(...funil.map(f => f.value), 1)

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Overview</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Visão geral da sua operação</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="card p-4">
            <div className={`p-2 rounded-lg ${kpi.bg} w-fit mb-3`}><kpi.icon size={18} className={kpi.color} /></div>
            <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{kpi.value}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Funil de Captação</h3>
        <div className="space-y-3">
          {funil.map(f => (
            <div key={f.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-secondary)]">{f.label}</span>
                <span className="text-[var(--text-primary)] font-mono font-bold">{f.value}</span>
              </div>
              <div className="h-2.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${f.color} transition-all duration-500`} style={{ width: `${(f.value / maxFunil) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}