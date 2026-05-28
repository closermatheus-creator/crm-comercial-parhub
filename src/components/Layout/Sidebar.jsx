import { NavLink } from 'react-router-dom'
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
  return (
    <aside className="w-64 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          <span className="text-brand-500">PAR</span>HUB
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">CRM Comercial</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="text-xs text-[var(--text-secondary)] text-center">
          v1.0.0
        </div>
      </div>
    </aside>
  )
}