import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge } from './Dashboard'

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Run manually',
  on_transaction: 'Runs on every transaction',
  on_salary_detected: 'Runs when payment received',
  on_low_balance: 'Runs on low balance',
  on_invoice_detected: 'Runs when invoice detected',
  scheduled_daily: 'Runs daily',
  scheduled_weekly: 'Runs weekly',
  scheduled_monthly: 'Runs monthly',
}

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  suggest_only: { label: 'Recommends actions', color: 'blue' },
  auto_execute: { label: 'Acts automatically', color: 'amber' },
}

const ACTION_LABELS: Record<string, string> = {
  analyse_transactions: 'Analyse transactions',
  analyse_affordability: 'Analyse affordability',
  detect_subscriptions: 'Detect subscriptions',
  scan_emails: 'Scan emails',
  detect_invoices: 'Detect invoices',
  create_payment_instruction: 'Create payment',
  transfer_between_accounts: 'Transfer funds',
  create_direct_debit: 'Create direct debit',
  generate_alert: 'Generate alert',
  request_user_approval: 'Request approval',
}

type ThinkingStep = { text: string; done: boolean }

function isAutoAgent(agent: any): boolean {
  return agent.is_enabled && agent.trigger_type !== 'manual'
}

export default function Agents({ userId }: { userId: number }) {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [runResult, setRunResult] = useState<any>(null)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [tab, setTab] = useState<'builtin' | 'custom'>('builtin')
  const [showCreate, setShowCreate] = useState(false)
  const [chatAgent, setChatAgent] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [promptAgent, setPromptAgent] = useState<any>(null)
  const [promptText, setPromptText] = useState('')

  const load = () => {
    api.getUserAgents(userId).then(setAgents).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  const simulateThinking = () => {
    const steps = [
      'Gathering financial context...',
      'Analysing accounts and transactions...',
      'Running AI reasoning...',
      'Generating insights...',
      'Finalising results...',
    ]
    setThinkingSteps(steps.map((t) => ({ text: t, done: false })))
    steps.forEach((_, i) => {
      setTimeout(() => {
        setThinkingSteps((prev) =>
          prev.map((s, j) => j <= i ? { ...s, done: true } : s)
        )
      }, 800 * (i + 1))
    })
  }

  const handleRun = async (agentId: number, extraContext?: Record<string, any>) => {
    setRunningId(agentId)
    setRunResult(null)
    simulateThinking()
    try {
      const result = await api.runAgent(userId, agentId, extraContext)
      const agent = agents.find((a) => a.id === agentId)
      setRunResult({ ...result, _agentName: agent?.name || result.agent_name || '' })
    } catch (e: any) {
      setRunResult({ error: e.message })
    } finally {
      setRunningId(null)
      setThinkingSteps([])
    }
  }

  const handleRunClick = (agent: any) => {
    setPromptAgent(agent)
    setPromptText('')
    setChatAgent(null)
    setChatMessages([])
    setChatInput('')
    setRunResult(null)
  }

  const handlePromptSubmit = () => {
    if (!promptAgent) return
    const extra = promptText.trim() ? { user_prompt: promptText.trim() } : undefined
    setChatAgent(promptAgent)
    setChatMessages([])
    setChatInput('')
    handleRun(promptAgent.id, extra)
    setPromptAgent(null)
    setPromptText('')
  }

  const handleSkipPrompt = () => {
    if (!promptAgent) return
    setChatAgent(promptAgent)
    setChatMessages([])
    setChatInput('')
    handleRun(promptAgent.id)
    setPromptAgent(null)
    setPromptText('')
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || !chatAgent) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])

    try {
      const res = await api.chat(userId, userMsg, chatMessages)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    }
  }

  const handleToggle = async (agentId: number, enabled: boolean) => {
    try {
      if (enabled) await api.disableAgent(userId, agentId)
      else await api.enableAgent(userId, agentId)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <Loading />

  const autoAgents = agents.filter(isAutoAgent)
  const builtin = agents.filter((a) => a.is_builtin)
  const custom = agents.filter((a) => !a.is_builtin)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Header title="AI Agents" subtitle="Automated business finance tools" />
        {tab === 'custom' && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm w-fit">
            + Create Agent
          </button>
        )}
      </div>

      {autoAgents.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Active Automations</h3>
          </div>
          <div className="space-y-2">
            {autoAgents.map((agent) => (
              <div key={agent.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-lg px-4 py-3 gap-2 border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{agent.name}</p>
                    <p className="text-xs text-gray-400">{TRIGGER_LABELS[agent.trigger_type] || agent.trigger_type}</p>
                  </div>
                </div>
                <button onClick={() => handleToggle(agent.id, true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-lg transition-colors shrink-0 w-fit border border-rose-200">
                  Stop
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit shadow-sm">
        {[
          { id: 'builtin' as const, label: `Built-in (${builtin.length})` },
          { id: 'custom' as const, label: `My Agents (${custom.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {promptAgent && !runningId && !runResult && (
        <div className="bg-white border border-blue-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Run {promptAgent.name}</h3>
              <p className="text-xs text-gray-400 mt-1">Provide additional context or instructions (optional)</p>
            </div>
            <button onClick={() => setPromptAgent(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePromptSubmit() } }}
            placeholder={`e.g. "Focus on invoices from last week" or "Check payments to AWS and Slack only"...`}
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handlePromptSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              {promptText.trim() ? 'Run with Context' : 'Run Agent'}
            </button>
            {!promptText.trim() && (
              <button onClick={handleSkipPrompt}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm rounded-lg transition-colors border border-gray-200">
                Run without prompt
              </button>
            )}
          </div>
        </div>
      )}

      {runningId && thinkingSteps.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-sm font-semibold text-blue-700">Agent is thinking...</h3>
          </div>
          <div className="space-y-2 pl-1">
            {thinkingSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <span className="text-emerald-600 text-xs">✓</span>
                ) : (
                  <span className="text-gray-300 text-xs">○</span>
                )}
                <span className={step.done ? 'text-gray-600' : 'text-gray-300'}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {runResult && <AgentResultUI result={runResult} onDismiss={() => { setRunResult(null); setChatAgent(null); setChatMessages([]) }} />}

      {runResult && !runResult.error && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Ask follow-up questions</p>
          {chatMessages.filter((m) => m.role !== 'system').map((msg, i) => (
            <div key={i} className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === 'user' ? 'bg-blue-50 text-blue-800 ml-8' : 'bg-gray-50 text-gray-600 mr-8'
            }`}>
              {msg.content}
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button onClick={handleChatSend} disabled={!chatInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm rounded-lg transition-colors shadow-sm">
              Send
            </button>
          </div>
        </div>
      )}

      {tab === 'builtin' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {builtin.map((agent) => (
            <AgentCard key={agent.id} agent={agent} running={runningId === agent.id} onRun={handleRunClick} onToggle={handleToggle} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {showCreate && <CreateAgentForm userId={userId} onCreated={() => { setShowCreate(false); load() }} />}
          {custom.length === 0 && !showCreate ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-400 text-sm">No custom agents yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {custom.map((agent) => (
                <AgentCard key={agent.id} agent={agent} running={runningId === agent.id} onRun={handleRunClick} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AgentResultUI({ result, onDismiss }: { result: any; onDismiss: () => void }) {
  if (result.error && !result.summary) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wider">Error</h3>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xs">Dismiss</button>
        </div>
        <p className="text-rose-600 text-sm">{result.error}</p>
      </div>
    )
  }

  const name = result._agentName || result.agent_name || ''

  return (
    <div className="bg-white border border-blue-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">{name || 'Agent Result'}</h3>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xs">Dismiss</button>
      </div>

      {result.summary && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
        </div>
      )}

      <Badge color={result.status === 'completed' ? 'green' : result.status === 'failed' ? 'red' : 'amber'}>
        {result.status}
      </Badge>

      {result.insights?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {result.insights.map((ins: string, i: number) => {
            const isWarn = /risk|over|high|exceed|concern|flag|overdue|decline/i.test(ins)
            const isGood = /good|healthy|strong|positive|under|saved|on track/i.test(ins)
            const borderColor = isWarn ? 'border-rose-300' : isGood ? 'border-emerald-300' : 'border-amber-300'
            const bgColor = isWarn ? 'bg-rose-50' : isGood ? 'bg-emerald-50' : 'bg-amber-50'
            const icon = isWarn ? '🔴' : isGood ? '🟢' : '🟡'
            return (
              <div key={i} className={`${bgColor} rounded-lg p-3 border-l-4 ${borderColor} flex gap-2 items-start`}>
                <span className="text-xs mt-0.5">{icon}</span>
                <p className="text-sm text-gray-700">{ins}</p>
              </div>
            )
          })}
        </div>
      )}

      {result.executed_actions?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase">Actions Taken</p>
          {result.executed_actions.map((a: any, i: number) => (
            <div key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg">
              {a.description || `${a.tool}: ${JSON.stringify(a.params)}`}
            </div>
          ))}
        </div>
      )}

      {result.approval_required_actions?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase">Awaiting Approval</p>
          {result.approval_required_actions.map((a: any, i: number) => (
            <div key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg">
              {a.description || `${a.tool}: ${JSON.stringify(a.params)}`}
            </div>
          ))}
        </div>
      )}

      {result.risk_flags?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase">Risk Flags</p>
          {result.risk_flags.map((f: string, i: number) => (
            <div key={i} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg flex items-center gap-2">
              <span>🔴</span> {f}
            </div>
          ))}
        </div>
      )}

      {result.reasoning && (
        <details>
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View AI reasoning</summary>
          <pre className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{result.reasoning}</pre>
        </details>
      )}
    </div>
  )
}

function AgentCard({ agent, running, onRun, onToggle }: {
  agent: any; running: boolean; onRun: (agent: any) => void; onToggle: (id: number, enabled: boolean) => void
}) {
  const mode = MODE_LABELS[agent.execution_mode] || { label: agent.execution_mode, color: 'gray' }
  const trigger = TRIGGER_LABELS[agent.trigger_type] || agent.trigger_type

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{agent.name}</h4>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{agent.description}</p>
        </div>
        <Badge color={agent.is_enabled ? 'green' : 'gray'}>{agent.is_enabled ? 'Active' : 'Inactive'}</Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-gray-400">{trigger}</span>
        <span className="text-gray-300">·</span>
        <Badge color={mode.color}>{mode.label}</Badge>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onRun(agent)} disabled={running || !agent.is_enabled}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">
          {running ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running...
            </span>
          ) : 'Run Agent'}
        </button>
        <button onClick={() => onToggle(agent.id, agent.is_enabled)}
          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs rounded-lg transition-colors border border-gray-200">
          {agent.is_enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  )
}

function CreateAgentForm({ userId, onCreated }: { userId: number; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', goal: '', description: '', trigger_type: 'manual', execution_mode: 'suggest_only',
    allowed_data_sources: ['transactions', 'balances', 'subscriptions', 'emails'],
    allowed_actions: ['analyse_transactions', 'generate_alert'],
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try { await api.createAgent(userId, form); onCreated() }
    catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Create Custom Agent</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Invoice Auditor" required />
        <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Audits invoices for compliance" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Goal / Instruction</label>
        <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
          placeholder="Analyse invoices and flag any that exceed typical amounts..." required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">When should it run?</label>
          <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">What should it do?</label>
          <select value={form.execution_mode} onChange={(e) => setForm({ ...form, execution_mode: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="suggest_only">Recommend actions only</option>
            <option value="auto_execute">Execute automatically</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Allowed Actions</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTION_LABELS).map(([action, label]) => (
            <label key={action} className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={form.allowed_actions.includes(action)}
                onChange={(e) => setForm({ ...form, allowed_actions: e.target.checked
                  ? [...form.allowed_actions, action] : form.allowed_actions.filter((a) => a !== action) })}
                className="rounded bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-500" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <button type="submit" disabled={submitting || !form.name || !form.goal}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
        {submitting ? 'Creating...' : 'Create Agent'}
      </button>
    </form>
  )
}

function Input({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
    </div>
  )
}
