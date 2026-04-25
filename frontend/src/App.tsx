import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Agents from './pages/Agents'
import Chat from './pages/Chat'
import Simulator from './pages/Simulator'
import Payments from './pages/Payments'
import Integrations from './pages/Integrations'
import AgentRuns from './pages/AgentRuns'

const USER_ID = 1

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'accounts', label: 'Accounts', icon: '◎' },
  { id: 'agents', label: 'AI Agents', icon: '⚙' },
  { id: 'chat', label: 'Ask AI', icon: '💬' },
  { id: 'activity', label: 'Activity', icon: '▤' },
  { id: 'simulator', label: 'Simulator', icon: '⚡' },
  { id: 'payments', label: 'Payments', icon: '£' },
  { id: 'integrations', label: 'Integrations', icon: '⟐' },
] as const

type Page = (typeof NAV)[number]['id']

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight text-white">OpenFinance AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Business Finance Automation</p>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                page === item.id
                  ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">A</div>
            <div>
              <p className="text-sm font-medium text-gray-200">Acme Corp</p>
              <p className="text-xs text-gray-500">admin@acmecorp.io</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {page === 'dashboard' && <Dashboard userId={USER_ID} />}
          {page === 'accounts' && <Accounts userId={USER_ID} />}
          {page === 'agents' && <Agents userId={USER_ID} />}
          {page === 'chat' && <Chat userId={USER_ID} />}
          {page === 'activity' && <AgentRuns userId={USER_ID} />}
          {page === 'simulator' && <Simulator userId={USER_ID} />}
          {page === 'payments' && <Payments userId={USER_ID} />}
          {page === 'integrations' && <Integrations userId={USER_ID} />}
        </div>
      </main>
    </div>
  )
}
