import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingUp, Target, Clock, MapPin } from 'lucide-react'

export default function Insights() {
  const { user } = useAuth()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user?.equipeId) carregar() }, [user])

  const carregar = async () => {
    const { data } = await supabase.from('contatos').select('*').eq('equipe_id', user.equipeId)
    setContatos((data || []).map(c => ({ ...c, status: c.status_por_usuario?.[user.uid] || c.status || 'nao_abordado' })))
    setLoading(false)
  }

  const tags = ['prospeccao_propria', 'inova', 'simple', 'social selling', 'base inteira', 'disparo']
  const dadosTags = tags.map(tag => {
    const daTag = contatos.filter(c => c.tag === tag)
    return { tag, total: daTag.length, fechados: daTag.filter(c => c.status === 'fechou').length, taxa: daTag.length > 0 ? ((daTag.filter(c => c.status === 'fechou').length / daTag.length) * 100).toFixed(1) : 0 }
  }).filter(t => t.total > 0).sort((a, b) => b.taxa - a.taxa)

  const fechados = contatos.filter(c => c.status === 'fechou')
  const taxaMedia = contatos.length > 0 ? ((fechados.length / contatos.length) * 100).toFixed(1) : 0

  const dddContagem = {}
  contatos.forEach(c => {
    if (c.telefone) {
      const ddd = c.telefone.slice(0, 2)
      dddContagem[ddd] = (dddContagem[ddd] || 0) + 1
    }
  })
  const dadosRegiao = Object.entries(dddContagem).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxRegiao = dadosRegiao.length > 0 ? Math.max(...dadosRegiao.map(r => r[1])) : 1

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Insights</h1><p className="text-sm text-[var(--text-secondary)]">{contatos.length} contatos analisados</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4"><Target size={16} className="text-brand-500 mb-2" /><p className="text-xl font-bold">{dadosTags[0]?.tag || '-'}</p><p className="text-xs text-green-500">{dadosTags[0]?.taxa || 0}% conversão</p><p className="text-[10px] text-[var(--text-secondary)]">Melhor Tag</p></div>
        <div className="card p-4"><TrendingUp size={16} className="text-green-500 mb-2" /><p className="text-xl font-bold">{taxaMedia}%</p><p className="text-xs text-[var(--text-secondary)]">Taxa Média</p></div>
        <div className="card p-4"><Clock size={16} className="text-amber-500 mb-2" /><p className="text-xl font-bold">-</p><p className="text-xs text-[var(--text-secondary)]">Tempo Médio</p></div>
        <div className="card p-4"><MapPin size={16} className="text-cyan-500 mb-2" /><p className="text-xl font-bold">{dadosRegiao.length}</p><p className="text-xs text-[var(--text-secondary)]">DDDs ativos</p></div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4">Conversão por Tag</h3>
        <div className="space-y-4">
          {dadosTags.map(t => (
            <div key={t.tag}>
              <div className="flex justify-between text-xs mb-1"><span className="capitalize">{t.tag}</span><span className="text-green-500 font-mono">{t.taxa}%</span></div>
              <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${t.taxa}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4">Top 10 DDDs</h3>
        <div className="space-y-2">
          {dadosRegiao.map(([ddd, total]) => (
            <div key={ddd} className="flex items-center gap-3">
              <span className="text-xs font-mono w-8">({ddd})</span>
              <div className="flex-1 h-5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-cyan-500 rounded-full" style={{ width: `${(total / maxRegiao) * 100}%` }} />
              </div>
              <span className="text-xs font-mono font-bold">{total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}