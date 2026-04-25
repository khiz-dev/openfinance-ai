import { useEffect, useState } from 'react'
import { api } from './lib/api'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Agents from './pages/Agents'
import Chat from './pages/Chat'
import { SimulatorWidget } from './pages/Simulator'
import Payments from './pages/Payments'
import Invoices from './pages/Invoices'
import Integrations from './pages/Integrations'
import AgentRuns from './pages/AgentRuns'

const USER_ID = 1

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'agents', label: 'AI Agents', icon: '⚙' },
  { id: 'chat', label: 'Ask AI', icon: '💬' },
  { id: 'invoices', label: 'Invoices', icon: '📋' },
  { id: 'payments', label: 'Payments', icon: '£' },
  { id: 'integrations', label: 'Integrations', icon: '⟐' },
  { id: 'accounts', label: 'Accounts', icon: '◎' },
  { id: 'activity', label: 'Activity', icon: '▤' },
] as const

type Page = (typeof NAV)[number]['id'] | 'simulator'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingIntents, setPendingIntents] = useState(0)

  useEffect(() => {
    api.getPaymentIntents(USER_ID)
      .then((intents) => setPendingIntents(intents.filter((i: any) => i.status === 'pending').length))
      .catch(() => {})
  }, [page])

  const navigate = (id: Page) => {
    setPage(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-900">
          <span className="text-xl">☰</span>
        </button>
        <h1 className="text-sm font-bold text-gray-900">Finance <span className="text-blue-600">Minions</span></h1>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 h-full w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">Finance <span className="text-blue-600">Minions</span></h1>
          <p className="text-xs text-gray-400 mt-0.5">Enterprise Financial Intelligence</p>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                page === item.id
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
              {item.id === 'payments' && pendingIntents > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{pendingIntents}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">A</div>
            <div>
              <p className="text-sm font-medium text-gray-800">Acme Corp</p>
              <p className="text-xs text-gray-400">admin@acmecorp.io</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {page === 'dashboard' && <Dashboard userId={USER_ID} />}
          {page === 'accounts' && <Accounts userId={USER_ID} />}
          {page === 'agents' && <Agents userId={USER_ID} />}
          {page === 'chat' && <Chat userId={USER_ID} />}
          {page === 'invoices' && <Invoices userId={USER_ID} />}
          {page === 'activity' && <AgentRuns userId={USER_ID} />}
          {page === 'payments' && <Payments userId={USER_ID} />}
          {page === 'integrations' && <Integrations userId={USER_ID} />}
        </div>
      </main>

      <SimulatorWidget userId={USER_ID} />
    </div>
  )
}
