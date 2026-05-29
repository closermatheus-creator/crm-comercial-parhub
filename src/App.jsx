import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Contatos from './pages/Contatos'
import Pipeline from './pages/Pipeline'
import Agenda from './pages/Agenda'
import Insights from './pages/Insights'
import Equipe from './pages/Equipe'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'admin') return <Navigate to="/overview" />
  
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="contatos" element={<Contatos />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="insights" element={<Insights />} />
        <Route path="equipe" element={<AdminRoute><Equipe /></AdminRoute>} />
      </Route>
    </Routes>
  )
}