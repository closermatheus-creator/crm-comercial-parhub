import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}