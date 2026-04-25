import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

export default function Dashboard({ userId }: { userId: number }) {
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoaded, setAiLoaded] = useState(false)

  useEffect(() => {
    Promise.all([api.getSummary(userId), api.getTransactions(userId)])
      .then(([s, t]) => { setSummary(s); setTransactions(t) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const generateInsights = useCallback(async () => {
    setAiLoading(true)
    try {
      const agents = await api.getUserAgents(userId)
      const healthAgent = agents.find((a: any) =>
        a.name === 'Financial Health Monitor' && a.is_enabled
      )
      if (healthAgent) {
        const result = await api.runAgent(userId, healthAgent.id)
        setAiInsights(result)
        setAiLoaded(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!aiLoaded && !aiLoading) generateInsights()
  }, [aiLoaded, aiLoading, generateInsights])

  if (loading) return <Loading />
  if (!summary) return <Error msg="Failed to load summary" />

  const score = summary.financial_health_score
  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = score >= 70 ? 'from-emerald-500/20' : score >= 40 ? 'from-amber-500/20' : 'from-red-500/20'

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const spendingEntries = Object.entries(summary.spending_by_category)
    .sort(([, a]: any, [, b]: any) => b - a)
  const maxSpend = spendingEntries.length > 0 ? (spendingEntries[0][1] as number) : 1

  return (
    <div className="space-y-6">
      <Header title="Business Dashboard" subtitle="Financial overview for your business" />

      {/* Top Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br ${scoreBg} to-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Health Score</p>
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-gray-700" strokeWidth="5" />
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className={scoreColor} strokeWidth="5"
                strokeDasharray={`${(score / 100) * 220} 220`} strokeLinecap="round" />
            </svg>
            <span className={`text-2xl font-bold ${scoreColor}`}>{score.toFixed(0)}</span>
          </div>
        </div>
        <StatCard label="Total Balance" value={`£${fmt(summary.total_balance)}`} accent="text-white" />
        <StatCard label="Monthly Income" value={`£${fmt(summary.monthly_income)}`} accent="text-emerald-400" />
        <StatCard label="Monthly Spending" value={`£${fmt(summary.monthly_spending)}`} accent="text-rose-400" />
      </div>

      {/* AI Insights with flags */}
      <Section title="AI Business Insights">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{aiLoaded ? 'Last generated just now' : ''}</p>
            <button
              onClick={generateInsights}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 text-gray-300 disabled:text-gray-600 text-xs rounded-lg transition-colors flex items-center gap-2"
            >
              {aiLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : '↻ Refresh Insights'}
            </button>
          </div>

          {aiLoading && !aiInsights ? (
            <div className="bg-gray-900 border border-indigo-500/20 rounded-xl p-6 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-indigo-300">Analysing your business finances...</p>
            </div>
          ) : aiInsights ? (
            <div className="space-y-3">
              {aiInsights.summary && (
                <div className="bg-gray-900 border-l-4 border-indigo-500 rounded-r-xl p-4">
                  <p className="text-sm text-gray-200 leading-relaxed">{aiInsights.summary}</p>
                </div>
              )}
              {aiInsights.insights?.map((ins: string, i: number) => {
                const flag = classifyFlag(ins)
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-xl p-4 border ${flag.bg} ${flag.border}`}>
                    <span className="text-lg mt-0.5">{flag.icon}</span>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${flag.label}`}>{flag.text}</p>
                      <p className={`text-sm ${flag.textColor}`}>{ins}</p>
                    </div>
                  </div>
                )
              })}
              {aiInsights.risk_flags?.length > 0 && aiInsights.risk_flags.map((f: string, i: number) => (
                <div key={`rf-${i}`} className="flex items-start gap-3 rounded-xl p-4 border bg-rose-500/5 border-rose-500/20">
                  <span className="text-lg mt-0.5">🔴</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-rose-400">Red Flag</p>
                    <p className="text-sm text-rose-300">{f}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click refresh to generate AI insights.</p>
          )}
        </div>
      </Section>

      {/* Recent Transactions */}
      <Section title="Recent Transactions">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800/50">
            {recentTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-xs text-gray-500 w-14 shrink-0">
                    {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{t.description || t.merchant}</p>
                    {t.category && <Badge>{t.category}</Badge>}
                  </div>
                </div>
                <span className={`text-sm font-medium whitespace-nowrap ${
                  t.transaction_type === 'credit' ? 'text-emerald-400' : 'text-gray-200'
                }`}>
                  {t.transaction_type === 'credit' ? '+' : '-'}£{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Spending by Category */}
      <Section title="Spending by Category">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          {spendingEntries.map(([cat, amount]: any) => (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 capitalize">{cat}</span>
                <span className="text-gray-100 font-medium">£{fmt(amount)}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${Math.max(2, (amount / maxSpend) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Subscriptions</p>
          <p className="text-xl font-bold text-white mt-1">£{fmt(summary.subscription_monthly_total)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
          <p className="text-xs text-gray-500 mt-0.5">{summary.subscription_count} active</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Risk Flags</p>
          <p className={`text-xl font-bold mt-1 ${summary.risk_flags.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.risk_flags.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{summary.risk_flags.length === 0 ? 'All clear' : 'Needs attention'}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Cashflow</p>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">{summary.cashflow_insight}</p>
        </div>
      </div>
    </div>
  )
}

function classifyFlag(text: string): {
  icon: string; text: string; bg: string; border: string; label: string; textColor: string
} {
  const lower = text.toLowerCase()
  if (/risk|warn|over|exceed|high concern|careful|negative|shortfall|overdue|flag|decline|loss/i.test(lower)) {
    return { icon: '🔴', text: 'Risk', bg: 'bg-rose-500/5', border: 'border-rose-500/20', label: 'text-rose-400', textColor: 'text-rose-300' }
  }
  if (/caution|attention|monitor|watch|moderate|slight|note|consider|review/i.test(lower)) {
    return { icon: '🟡', text: 'Attention', bg: 'bg-amber-500/5', border: 'border-amber-500/20', label: 'text-amber-400', textColor: 'text-amber-300' }
  }
  return { icon: '🟢', text: 'Healthy', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', label: 'text-emerald-400', textColor: 'text-emerald-300' }
}

// ── Shared UI helpers ──────────────────────────────────────────────────

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </section>
  )
}

export function StatCard({ label, value, accent = 'text-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}

export function Loading() {
  return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
}

export function Error({ msg }: { msg: string }) {
  return <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-300 text-sm">{msg}</div>
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-700/50 text-gray-300',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-rose-500/15 text-rose-400',
    amber: 'bg-amber-500/15 text-amber-400',
    indigo: 'bg-indigo-500/15 text-indigo-400',
    blue: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>
}

export function fmt(n: number) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
