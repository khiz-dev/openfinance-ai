import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Section, Badge } from './Dashboard'

const PRESETS = [
  { label: 'Salary Payment', amount: 3850, description: 'SALARY — Acme Corp Ltd', category: 'salary', merchant: 'Acme Corp', type: 'credit' },
  { label: 'Rent Payment', amount: 1200, description: 'RENT — Landlord J Smith', category: 'rent', merchant: 'Landlord', type: 'debit' },
  { label: 'Grocery Shopping', amount: 67.50, description: 'CARD PAYMENT — Tesco', category: 'groceries', merchant: 'Tesco', type: 'debit' },
  { label: 'Restaurant', amount: 42.80, description: 'CARD PAYMENT — Nandos', category: 'restaurants', merchant: 'Nandos', type: 'debit' },
  { label: 'Subscription', amount: 15.99, description: 'DD — Netflix Premium', category: 'subscriptions', merchant: 'Netflix', type: 'debit' },
  { label: 'Online Shopping', amount: 89.99, description: 'ONLINE PURCHASE — Amazon', category: 'shopping', merchant: 'Amazon', type: 'debit' },
]

export default function Simulator({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({
    account_id: 0,
    amount: 0,
    description: '',
    category: '',
    merchant: '',
    transaction_type: 'debit',
  })
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getAccounts(userId).then((accs) => {
      setAccounts(accs)
      if (accs.length > 0) setForm((f) => ({ ...f, account_id: accs[0].id }))
    })
  }, [userId])

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setForm({
      ...form,
      amount: preset.amount,
      description: preset.description,
      category: preset.category,
      merchant: preset.merchant,
      transaction_type: preset.type,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await api.simulateTransaction({ user_id: userId, ...form })
      setResult(res)
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header title="Transaction Simulator" subtitle="Inject transactions and watch agents react in real-time" />

      {/* Presets */}
      <Section title="Quick Presets">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              {p.label} — £{p.amount}
            </button>
          ))}
        </div>
      </Section>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Account</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} (£{a.balance.toFixed(2)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={form.transaction_type}
              onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Merchant</label>
            <input
              type="text"
              value={form.merchant}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Simulating...' : 'Simulate Transaction'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`bg-gray-900 border rounded-xl p-5 space-y-3 ${result.error ? 'border-rose-500/30' : 'border-emerald-500/30'}`}>
          {result.error ? (
            <p className="text-rose-400 text-sm">{result.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Badge color="green">Transaction #{result.transaction_id}</Badge>
                <span className="text-sm text-gray-300">New Balance: <span className="font-semibold text-white">£{result.new_balance?.toFixed(2)}</span></span>
              </div>
              {result.triggered_agents?.length > 0 && (
                <Section title="Triggered Agents">
                  <div className="space-y-2">
                    {result.triggered_agents.map((a: any, i: number) => (
                      <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-indigo-300">{a.agent_name}</span>
                          <Badge color={a.status === 'completed' ? 'green' : a.error ? 'red' : 'amber'}>{a.status || 'error'}</Badge>
                        </div>
                        {a.summary && <p className="text-xs text-gray-400">{a.summary}</p>}
                        {a.error && <p className="text-xs text-rose-400">{a.error}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {(!result.triggered_agents || result.triggered_agents.length === 0) && (
                <p className="text-xs text-gray-500">No agents triggered by this transaction.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
