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

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Agents({ userId }: { userId: number }) {
  const [agents, setAgents] = useState<any[]>([])
  const [agentRuns, setAgentRuns] = useState<any[]>([])
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
    Promise.all([api.getUserAgents(userId), api.getAgentRuns(userId)])
      .then(([a, r]) => { setAgents(a); setAgentRuns(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-800">Active Automations</h3>
            <span className="text-xs text-gray-400 ml-auto">{autoAgents.length} running</span>
          </div>
          <div className="divide-y divide-gray-100">
            {autoAgents.map((agent) => {
              const lastRun = agentRuns.find((r: any) => r.agent_definition_id === agent.id)
              const lastRunTime = lastRun?.started_at ? new Date(lastRun.started_at) : null
              const timeSince = lastRunTime ? getTimeSince(lastRunTime) : null
              return (
                <div key={agent.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{agent.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{agent.description}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ⚡ {TRIGGER_LABELS[agent.trigger_type] || agent.trigger_type}
                          </span>
                          {lastRun && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                              Last ran {timeSince} · <Badge color={lastRun.status === 'completed' ? 'green' : lastRun.status === 'failed' ? 'red' : 'amber'}>{lastRun.status}</Badge>
                            </span>
                          )}
                          {!lastRun && (
                            <span className="text-[10px] text-gray-400">Waiting for trigger — hasn't run yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleToggle(agent.id, true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-lg transition-colors shrink-0 border border-rose-200 mt-1">
                      Stop
                    </button>
                  </div>
                </div>
              )
            })}
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
          {builtin.map((agent) => {
            const lastRun = agentRuns.find((r: any) => r.agent_definition_id === agent.id)
            return (
              <AgentCard key={agent.id} agent={agent} running={runningId === agent.id} onRun={handleRunClick} onToggle={handleToggle} lastRun={lastRun} />
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {showCreate && <CreateAgentForm userId={userId} onCreated={() => { setShowCreate(false); load() }} />}
          {custom.length === 0 && !showCreate ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                <span className="text-xl">🤖</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">No custom agents yet</p>
              <p className="text-gray-400 text-xs max-w-xs mx-auto">Create your first agent from a template or build one from scratch to automate your workflows.</p>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                Create Your First Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {custom.map((agent) => {
                const lastRun = agentRuns.find((r: any) => r.agent_definition_id === agent.id)
                return (
                  <AgentCard key={agent.id} agent={agent} running={runningId === agent.id} onRun={handleRunClick} onToggle={handleToggle} lastRun={lastRun} />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const TOOL_DISPLAY: Record<string, { label: string; icon: string }> = {
  create_payment_instruction: { label: 'Payment created', icon: '💳' },
  transfer_between_accounts: { label: 'Transfer initiated', icon: '🔄' },
  create_direct_debit: { label: 'Direct debit set up', icon: '📋' },
  generate_alert: { label: 'Alert raised', icon: '🔔' },
  request_user_approval: { label: 'Approval requested', icon: '⏳' },
  analyse_transactions: { label: 'Transactions analysed', icon: '📊' },
  analyse_affordability: { label: 'Affordability checked', icon: '📈' },
  detect_subscriptions: { label: 'Subscriptions scanned', icon: '🔍' },
  scan_emails: { label: 'Emails scanned', icon: '📧' },
  detect_invoices: { label: 'Invoices detected', icon: '📄' },
}

function formatAction(a: any): { payee: string; amount: string; description: string; detail: string; icon: string; params: any } {
  const tool = a.tool || ''
  const display = TOOL_DISPLAY[tool] || { label: tool, icon: '⚡' }
  const params = a.params || {}
  const result = a.result || {}

  const payee = params.payee || params.payee_name || params.supplier_name || result.payee_name || ''
  const amount = params.amount || result.amount || ''
  const reference = params.reference || result.reference || ''

  if (a.description) {
    const match = a.description.match(/payment.*?for\s+(.+?)\s+for\s+£([\d,.]+)/i)
    if (match) return { payee: match[1], amount: match[2], description: a.description, detail: '', icon: display.icon, params }
    return { payee, amount: amount ? `${amount}` : '', description: a.description, detail: '', icon: display.icon, params }
  }

  let desc = display.label
  if (payee) desc += ` for ${payee}`
  if (amount) desc += ` — £${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`

  let detail = ''
  if (tool === 'generate_alert') {
    const msg = params.message || params.alert_message || result.message || params.reason || ''
    desc = `${display.label}: ${msg || (payee ? `Flagged ${payee}` : 'System notification')}`
    detail = msg
  }
  if (tool === 'request_user_approval') {
    desc = `${display.label}: ${params.reason || params.message || (payee ? `Review ${payee}` : 'Action needs review')}`
  }

  if (reference) detail = detail ? `${detail} (Ref: ${reference})` : `Ref: ${reference}`

  return { payee, amount: amount ? `${amount}` : '', description: desc, detail, icon: display.icon, params }
}

function AgentResultUI({ result, onDismiss }: { result: any; onDismiss: () => void }) {
  const [approvedActions, setApprovedActions] = useState<Set<number>>(new Set())
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null)

  const handleApprove = async (action: any, idx: number) => {
    setApprovingIdx(idx)
    try {
      const formatted = formatAction(action)
      await api.approveAction(1, { payee: formatted.payee, amount: formatted.amount, ...formatted.params })
      setApprovedActions(prev => new Set(prev).add(idx))
    } catch (e) {
      console.error(e)
    } finally {
      setApprovingIdx(null)
    }
  }

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
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Actions Taken</p>
          {result.executed_actions.map((a: any, i: number) => {
            const action = formatAction(a)
            return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-sm">{action.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-800">{action.description}</p>
                  {action.detail && <p className="text-xs text-emerald-600 mt-0.5">{action.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {result.approval_required_actions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Pending Approval</p>
          {result.approval_required_actions.map((a: any, i: number) => {
            const action = formatAction(a)
            const isApproved = approvedActions.has(i)
            return (
              <div key={i} className={`border rounded-xl p-4 ${isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApproved ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      <span className="text-sm">{isApproved ? '✓' : '⏳'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isApproved ? 'text-emerald-800' : 'text-gray-800'}`}>
                        {action.description}
                      </p>
                      {action.detail && !isApproved && <p className="text-xs text-gray-500 mt-0.5">{action.detail}</p>}
                      {isApproved && <p className="text-xs text-emerald-600 mt-1">Payment approved and will be processed</p>}
                    </div>
                  </div>
                  {!isApproved && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(a, i)}
                        disabled={approvingIdx === i}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        {approvingIdx === i ? 'Approving...' : 'Approve'}
                      </button>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg transition-colors border border-gray-200">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {result.risk_flags?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Risk Flags</p>
          {result.risk_flags.map((f: string, i: number) => (
            <div key={i} className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                <span className="text-sm">⚠</span>
              </div>
              <p className="text-sm text-rose-700">{f}</p>
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

function AgentCard({ agent, running, onRun, onToggle, lastRun }: {
  agent: any; running: boolean; onRun: (agent: any) => void; onToggle: (id: number, enabled: boolean) => void; lastRun?: any
}) {
  const [autoMode, setAutoMode] = useState(agent.requires_approval === false)
  const mode = MODE_LABELS[agent.execution_mode] || { label: agent.execution_mode, color: 'gray' }
  const trigger = TRIGGER_LABELS[agent.trigger_type] || agent.trigger_type
  const lastRunTime = lastRun?.started_at ? new Date(lastRun.started_at) : null
  const timeSince = lastRunTime ? getTimeSince(lastRunTime) : null

  const handleAutoToggle = async () => {
    const newValue = !autoMode
    setAutoMode(newValue)
    try {
      await api.updateAgentSettings(1, agent.id, {
        requires_approval: !newValue,
        execution_mode: newValue ? 'auto_execute' : 'suggest_only',
      })
    } catch (e) {
      setAutoMode(!newValue)
      console.error(e)
    }
  }

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
        <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">⚡ {trigger}</span>
        <Badge color={mode.color}>{mode.label}</Badge>
      </div>

      {lastRun && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <div className={`w-2 h-2 rounded-full shrink-0 ${lastRun.status === 'completed' ? 'bg-emerald-500' : lastRun.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'}`} />
          <p className="text-xs text-gray-500 flex-1">
            Last ran <span className="font-medium text-gray-700">{timeSince}</span>
            {lastRun.status === 'completed' && ' — completed successfully'}
            {lastRun.status === 'failed' && ' — failed'}
            {lastRun.status === 'running' && ' — still running'}
          </p>
        </div>
      )}
      {!lastRun && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
          <p className="text-xs text-gray-400">Never run — click "Run Agent" to start</p>
        </div>
      )}

      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        <div>
          <p className="text-xs font-medium text-gray-700">Full AI Control</p>
          <p className="text-[10px] text-gray-400">Execute actions without approval</p>
        </div>
        <button
          onClick={handleAutoToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${autoMode ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
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

const AGENT_TEMPLATES = [
  {
    icon: '📋', label: 'Invoice Auditor',
    description: 'Audits invoices for compliance and flags unusual amounts',
    name: 'Invoice Auditor', goal: 'Review all invoices and flag any that exceed typical amounts, have missing details, or come from unfamiliar suppliers.',
    trigger_type: 'on_invoice_detected', execution_mode: 'suggest_only',
    allowed_actions: ['scan_emails', 'detect_invoices', 'generate_alert'],
  },
  {
    icon: '💸', label: 'Expense Watchdog',
    description: 'Monitors spending and alerts when budgets are exceeded',
    name: 'Expense Watchdog', goal: 'Monitor all business expenses in real-time. Alert when spending in any category exceeds normal levels or when unusual transactions are detected.',
    trigger_type: 'on_transaction', execution_mode: 'suggest_only',
    allowed_actions: ['analyse_transactions', 'generate_alert'],
  },
  {
    icon: '🔄', label: 'Payment Scheduler',
    description: 'Automatically schedules recurring payments on time',
    name: 'Payment Scheduler', goal: 'Track recurring payment obligations and ensure they are scheduled on time. Flag any missed or upcoming payments.',
    trigger_type: 'scheduled_weekly', execution_mode: 'auto_execute',
    allowed_actions: ['create_payment_instruction', 'generate_alert', 'request_user_approval'],
  },
  {
    icon: '📊', label: 'Weekly Report',
    description: 'Generates a weekly financial summary every Monday',
    name: 'Weekly Financial Report', goal: 'Every week, generate a concise financial summary including income vs expenses, cash position, notable transactions, and any risks.',
    trigger_type: 'scheduled_weekly', execution_mode: 'suggest_only',
    allowed_actions: ['analyse_transactions', 'generate_alert'],
  },
  {
    icon: '⚠', label: 'Low Balance Alert',
    description: 'Warns when any account balance drops below a threshold',
    name: 'Low Balance Monitor', goal: 'Monitor all bank accounts continuously. Generate an immediate alert if any account balance drops below a safe threshold. Suggest transfers from surplus accounts.',
    trigger_type: 'on_low_balance', execution_mode: 'suggest_only',
    allowed_actions: ['analyse_transactions', 'transfer_between_accounts', 'generate_alert'],
  },
  {
    icon: '✏', label: 'Custom from scratch',
    description: 'Build your own agent with full control',
    name: '', goal: '', trigger_type: 'manual', execution_mode: 'suggest_only',
    allowed_actions: ['analyse_transactions', 'generate_alert'],
  },
]

function CreateAgentForm({ userId, onCreated }: { userId: number; onCreated: () => void }) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [form, setForm] = useState({
    name: '', goal: '', description: '', trigger_type: 'manual', execution_mode: 'suggest_only',
    allowed_data_sources: ['transactions', 'balances', 'subscriptions', 'emails'],
    allowed_actions: ['analyse_transactions', 'generate_alert'],
  })
  const [submitting, setSubmitting] = useState(false)

  const applyTemplate = (t: typeof AGENT_TEMPLATES[number]) => {
    setForm({
      ...form,
      name: t.name,
      description: t.description,
      goal: t.goal,
      trigger_type: t.trigger_type,
      execution_mode: t.execution_mode,
      allowed_actions: t.allowed_actions,
    })
    setStep('configure')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try { await api.createAgent(userId, form); onCreated() }
    catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  if (step === 'pick') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Create a Custom Agent</h3>
          <p className="text-xs text-gray-400 mt-0.5">Start from a template or build from scratch</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              className="text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{t.icon}</span>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{t.label}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Configure Your Agent</h3>
          <p className="text-xs text-gray-400 mt-0.5">Customise the details or use as-is</p>
        </div>
        <button type="button" onClick={() => setStep('pick')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          ← Back to templates
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Agent Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Invoice Auditor" required />
        <Input label="Short Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What does this agent do?" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">What should the agent do? <span className="text-gray-300">(be specific)</span></label>
        <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          rows={3}
          placeholder="e.g. Review all invoices from the last 7 days. Flag any over £5,000 or from new suppliers..." required />
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
          <label className="block text-xs text-gray-500 mb-1">How should it act?</label>
          <select value={form.execution_mode} onChange={(e) => setForm({ ...form, execution_mode: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="suggest_only">Recommend actions (you approve)</option>
            <option value="auto_execute">Execute automatically (full AI control)</option>
          </select>
        </div>
      </div>

      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
          Advanced: Allowed actions
        </summary>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {Object.entries(ACTION_LABELS).map(([action, label]) => (
            <label key={action} className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
              <input type="checkbox" checked={form.allowed_actions.includes(action)}
                onChange={(e) => setForm({ ...form, allowed_actions: e.target.checked
                  ? [...form.allowed_actions, action] : form.allowed_actions.filter((a) => a !== action) })}
                className="rounded bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-500" />
              {label}
            </label>
          ))}
        </div>
      </details>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={submitting || !form.name || !form.goal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
          {submitting ? 'Creating...' : 'Create Agent'}
        </button>
        <button type="button" onClick={() => setStep('pick')}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm rounded-lg transition-colors border border-gray-200">
          Cancel
        </button>
      </div>
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
