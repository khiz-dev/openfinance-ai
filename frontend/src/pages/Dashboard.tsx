import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

let _cachedInsights: any = null
let _insightsGenerated = false

export default function Dashboard({ userId }: { userId: number }) {
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [aiInsights, setAiInsights] = useState<any>(_cachedInsights)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoaded, setAiLoaded] = useState(_insightsGenerated)

  useEffect(() => {
    Promise.all([api.getSummary(userId), api.getTransactions(userId)])
      .then(([s, t]) => { setSummary(s); setTransactions(t) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const generateInsights = useCallback(async () => {
    if (_insightsGenerated) return
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
        _cachedInsights = result
        _insightsGenerated = true
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }, [userId])

  const refreshInsights = useCallback(async () => {
    _insightsGenerated = false
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
        _cachedInsights = result
        _insightsGenerated = true
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!_insightsGenerated && !aiLoading) generateInsights()
  }, [aiLoading, generateInsights])

  if (loading) return <Loading />
  if (!summary) return <Error msg="Failed to load summary" />

  const score = summary.financial_health_score
  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-rose-600'
  const scoreRingColor = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'
  const scoreBgGrad = score >= 70 ? 'from-emerald-50 to-white' : score >= 40 ? 'from-amber-50 to-white' : 'from-rose-50 to-white'

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  const spendingEntries = Object.entries(summary.spending_by_category)
    .sort(([, a]: any, [, b]: any) => b - a)
  const maxSpend = spendingEntries.length > 0 ? (spendingEntries[0][1] as number) : 1
  const totalSpending = spendingEntries.reduce((sum, [, v]) => sum + (v as number), 0)

  return (
    <div className="space-y-6">
      <Header title="Business Dashboard" subtitle="Financial overview for your business" />

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br ${scoreBgGrad} border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm`}>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">Health Score</p>
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-gray-100" strokeWidth="5" />
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className={scoreRingColor} strokeWidth="5"
                strokeDasharray={`${(score / 100) * 220} 220`} strokeLinecap="round" />
            </svg>
            <span className={`text-2xl font-bold ${scoreColor}`}>{score.toFixed(0)}</span>
          </div>
        </div>
        <StatCard label="Total Balance" value={`£${fmt(summary.total_balance)}`} />
        <StatCard label="Monthly Income" value={`£${fmt(summary.monthly_income)}`} accent="text-emerald-600" />
        <StatCard label="Monthly Spending" value={`£${fmt(summary.monthly_spending)}`} accent="text-rose-600" />
      </div>

      {/* AI Business Insights — redesigned */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">✦</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">AI Business Insights</h3>
              <p className="text-[10px] text-gray-400">{aiLoaded ? 'Generated just now' : 'Powered by AI analysis'}</p>
            </div>
          </div>
          <button
            onClick={refreshInsights}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-500 text-xs font-medium rounded-lg border border-gray-200 transition-colors flex items-center gap-1.5"
          >
            {aiLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Analysing...
              </>
            ) : '↻ Refresh'}
          </button>
        </div>

        <div className="p-5">
          {aiLoading && !aiInsights ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analysing your business finances...</p>
            </div>
          ) : aiInsights ? (
            <div className="space-y-4">
              {aiInsights.summary && (
                <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3">{aiInsights.summary}</p>
              )}

              {/* Insights Grid */}
              {aiInsights.insights?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiInsights.insights.map((ins: string, i: number) => {
                    const flag = classifyFlag(ins)
                    return (
                      <div key={i} className={`flex items-start gap-3 rounded-xl p-3.5 border ${flag.bg} ${flag.border}`}>
                        <div className={`w-7 h-7 rounded-lg ${flag.iconBg} flex items-center justify-center shrink-0`}>
                          <span className="text-xs">{flag.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${flag.label}`}>{flag.text}</p>
                          <p className={`text-xs leading-relaxed ${flag.textColor}`}>{ins}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Risk Flags */}
              {aiInsights.risk_flags?.length > 0 && (
                <div className="space-y-2">
                  {aiInsights.risk_flags.map((f: string, i: number) => (
                    <div key={`rf-${i}`} className="flex items-start gap-3 rounded-xl p-3.5 border bg-rose-50 border-rose-200">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                        <span className="text-xs">🔴</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-rose-600">Red Flag</p>
                        <p className="text-xs text-rose-700 leading-relaxed">{f}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Click refresh to generate AI insights.</p>
          )}
        </div>
      </section>

      {/* Two-column layout: Transactions + Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Transactions (wider) */}
        <div className="lg:col-span-3">
          <Section title="Recent Transactions">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {recentTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        t.transaction_type === 'credit'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.transaction_type === 'credit' ? '↓' : '↑'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{t.description || t.merchant}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          {t.category && <Badge>{t.category}</Badge>}
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${
                      t.transaction_type === 'credit' ? 'text-emerald-600' : 'text-gray-800'
                    }`}>
                      {t.transaction_type === 'credit' ? '+' : '-'}£{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>

        {/* Spending by Category (narrower) */}
        <div className="lg:col-span-2">
          <Section title="Spending by Category">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
              {spendingEntries.map(([cat, amount]: any) => {
                const pct = ((amount / totalSpending) * 100).toFixed(0)
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 capitalize font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{pct}%</span>
                        <span className="text-gray-800 font-semibold">£{fmt(amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                        style={{ width: `${Math.max(3, (amount / maxSpend) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Subscriptions</p>
          <p className="text-xl font-bold text-gray-900 mt-1">£{fmt(summary.subscription_monthly_total)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
          <p className="text-xs text-gray-400 mt-0.5">{summary.subscription_count} active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Risk Flags</p>
          <p className={`text-xl font-bold mt-1 ${summary.risk_flags.length === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {summary.risk_flags.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{summary.risk_flags.length === 0 ? 'All clear' : 'Needs attention'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Cashflow</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{summary.cashflow_insight}</p>
        </div>
      </div>
    </div>
  )
}

function classifyFlag(text: string): {
  icon: string; text: string; bg: string; border: string; label: string; textColor: string; iconBg: string
} {
  const lower = text.toLowerCase()
  if (/risk|warn|over|exceed|high concern|careful|negative|shortfall|overdue|flag|decline|loss/i.test(lower)) {
    return { icon: '🔴', text: 'Risk', bg: 'bg-rose-50', border: 'border-rose-200', label: 'text-rose-600', textColor: 'text-rose-700', iconBg: 'bg-rose-100' }
  }
  if (/caution|attention|monitor|watch|moderate|slight|note|consider|review/i.test(lower)) {
    return { icon: '🟡', text: 'Attention', bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-600', textColor: 'text-amber-700', iconBg: 'bg-amber-100' }
  }
  return { icon: '🟢', text: 'Healthy', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-600', textColor: 'text-emerald-700', iconBg: 'bg-emerald-100' }
}

// ── Shared UI helpers ──────────────────────────────────────────────────

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </section>
  )
}

export function StatCard({ label, value, accent = 'text-gray-900' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-400 text-sm">Loading...</span>
    </div>
  )
}

export function Error({ msg }: { msg: string }) {
  return <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-600 text-sm">{msg}</div>
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-blue-50 text-blue-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${colors[color] || colors.gray}`}>{children}</span>
}

export function fmt(n: number) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
