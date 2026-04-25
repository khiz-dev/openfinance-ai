import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import { Header, Badge } from './Dashboard'

type SuggestedAgent = { id: number; name: string; description: string }

type Message = {
  role: 'user' | 'assistant'
  content: string
  suggestedAgent?: SuggestedAgent | null
}

type AgentResult = {
  agentName: string
  status: string
  summary?: string
  insights?: string[]
  risk_flags?: string[]
  executed_actions?: any[]
  approval_required_actions?: any[]
  error?: string
}

export default function Chat({ userId }: { userId: number }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [runningAgent, setRunningAgent] = useState<number | null>(null)
  const [agentResults, setAgentResults] = useState<Record<number, AgentResult>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentResults])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await api.chat(userId, text, updated.slice(0, -1).map(m => ({ role: m.role, content: m.content })))
      setMessages([...updated, {
        role: 'assistant',
        content: res.reply,
        suggestedAgent: res.suggested_agent || null,
      }])
    } catch (e: any) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleRunAgent = async (agent: SuggestedAgent, messageIndex: number) => {
    setRunningAgent(agent.id)
    try {
      const result = await api.runAgent(userId, agent.id)
      setAgentResults(prev => ({
        ...prev,
        [messageIndex]: {
          agentName: agent.name,
          status: result.status,
          summary: result.summary,
          insights: result.insights,
          risk_flags: result.risk_flags,
          executed_actions: result.executed_actions,
          approval_required_actions: result.approval_required_actions,
          error: result.error || result.errors?.join(', '),
        },
      }))
    } catch (e: any) {
      setAgentResults(prev => ({
        ...prev,
        [messageIndex]: { agentName: agent.name, status: 'failed', error: e.message },
      }))
    } finally {
      setRunningAgent(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-3rem)]">
      <Header title="Ask AI" subtitle="Ask anything about your business finances" />

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">💬</div>
          <div className="text-center max-w-md">
            <p className="text-lg font-semibold text-gray-800">Ask anything about your finances</p>
            <p className="text-sm text-gray-400 mt-2">I can answer questions and suggest AI agents to run deeper analyses on your invoices, expenses, cash flow, and more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {[
              'Track and manage my invoices',
              'Analyse our cash flow forecast',
              'What are our top expenses this month?',
              'Review our SaaS subscriptions',
            ].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>

              {msg.suggestedAgent && !agentResults[i] && (
                <div className="flex justify-start mt-2">
                  <div className="max-w-[80%] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-white text-sm">⚙</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Suggested Agent</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{msg.suggestedAgent.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{msg.suggestedAgent.description}</p>
                        <button
                          onClick={() => handleRunAgent(msg.suggestedAgent!, i)}
                          disabled={runningAgent === msg.suggestedAgent.id}
                          className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          {runningAgent === msg.suggestedAgent.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>Run {msg.suggestedAgent.name}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {agentResults[i] && (
                <div className="flex justify-start mt-2">
                  <AgentResultCard result={agentResults[i]} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="sticky bottom-0 pt-4 pb-2 bg-[#f7f8fa]">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business finances..."
            rows={1}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentResultCard({ result }: { result: AgentResult }) {
  const isError = result.status === 'failed' || !!result.error

  return (
    <div className={`max-w-[85%] border rounded-2xl shadow-sm overflow-hidden ${
      isError ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-white'
    }`}>
      <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${
        isError ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'
      }`}>
        <span className="text-sm">{isError ? '⚠' : '✓'}</span>
        <span className="text-xs font-semibold text-gray-700">{result.agentName}</span>
        <Badge color={isError ? 'red' : 'green'}>{result.status}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {result.error && (
          <p className="text-sm text-rose-600">{result.error}</p>
        )}

        {result.summary && (
          <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
        )}

        {result.insights && result.insights.length > 0 && (
          <div className="space-y-1.5">
            {result.insights.map((ins, i) => {
              const isWarn = /risk|over|high|exceed|concern|flag|overdue|decline/i.test(ins)
              const isGood = /good|healthy|strong|positive|under|saved|on track|paid|approved/i.test(ins)
              return (
                <div key={i} className={`flex items-start gap-2 rounded-lg p-2.5 border text-xs ${
                  isWarn ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  isGood ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <span className="mt-0.5">{isWarn ? '🔴' : isGood ? '🟢' : '🟡'}</span>
                  <span>{ins}</span>
                </div>
              )
            })}
          </div>
        )}

        {result.executed_actions && result.executed_actions.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Actions Taken</p>
            {result.executed_actions.map((a: any, i: number) => (
              <div key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                {a.description || `${a.tool}: ${JSON.stringify(a.params)}`}
              </div>
            ))}
          </div>
        )}

        {result.approval_required_actions && result.approval_required_actions.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Awaiting Approval</p>
            {result.approval_required_actions.map((a: any, i: number) => (
              <div key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                {a.description || `${a.tool}: ${JSON.stringify(a.params)}`}
              </div>
            ))}
          </div>
        )}

        {result.risk_flags && result.risk_flags.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Risk Flags</p>
            {result.risk_flags.map((f, i) => (
              <div key={i} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <span>🔴</span> {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
