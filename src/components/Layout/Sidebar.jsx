import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutDashboard, Users, KanbanSquare, Calendar, BarChart3, UserPlus } from 'lucide-react'

const links = [
  { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/contatos', icon: Users, label: 'Contatos' },
  { to: '/pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
  { to: '/equipe', icon: UserPlus, label: 'Equipe' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const sistemaNome = user?.equipe?.nome_sistema || 'PARHUB'
  const corPrimaria = user?.equipe?.cor_primaria || '#a855f7'

  return (
    <aside className="w-64 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          {user?.equipe?.logo_url ? (
            <img src={user.equipe.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: corPrimaria }}>
              {sistemaNome.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">{sistemaNome}</h1>
            <p className="text-[10px] text-[var(--text-secondary)]">CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            style={({ isActive }) => isActive ? { backgroundColor: corPrimaria + '20', color: corPrimaria, borderLeftColor: corPrimaria } : {}}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="text-xs text-[var(--text-secondary)] text-center">v1.0.0</div>
      </div>
    </aside>
  )
}