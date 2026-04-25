import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Badge } from './Dashboard'

const PRESETS = [
  { label: 'Salary', amount: 3850, description: 'SALARY — Acme Corp Ltd', category: 'salary', merchant: 'Acme Corp', type: 'credit' },
  { label: 'Rent', amount: 1200, description: 'RENT — Landlord J Smith', category: 'rent', merchant: 'Landlord', type: 'debit' },
  { label: 'Groceries', amount: 67.50, description: 'CARD PAYMENT — Tesco', category: 'groceries', merchant: 'Tesco', type: 'debit' },
  { label: 'Restaurant', amount: 42.80, description: 'CARD PAYMENT — Nandos', category: 'restaurants', merchant: 'Nandos', type: 'debit' },
  { label: 'Netflix', amount: 15.99, description: 'DD — Netflix Premium', category: 'subscriptions', merchant: 'Netflix', type: 'debit' },
  { label: 'Amazon', amount: 89.99, description: 'ONLINE PURCHASE — Amazon', category: 'shopping', merchant: 'Amazon', type: 'debit' },
]

export function SimulatorWidget({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false)
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
    api.getAccounts(userId).then(accs => {
      setAccounts(accs)
      if (accs.length > 0) setForm(f => ({ ...f, account_id: accs[0].id }))
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

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2"
        >
          <span>⚡</span> Simulator
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-96 max-h-[80vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span>⚡</span>
          <span className="text-sm font-semibold text-gray-800">Transaction Simulator</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs rounded-md transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Account</label>
            <select
              value={form.account_id}
              onChange={e => setForm({ ...form, account_id: Number(e.target.value) })}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={form.transaction_type}
                onChange={e => setForm({ ...form, transaction_type: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Simulating...' : 'Simulate Transaction'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`border rounded-lg p-3 space-y-1.5 ${result.error ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
            {result.error ? (
              <p className="text-rose-600 text-xs">{result.error}</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge color="green">#{result.transaction_id}</Badge>
                  <span className="text-xs text-gray-600">Balance: £{result.new_balance?.toFixed(2)}</span>
                </div>
                {result.triggered_agents?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {result.triggered_agents.map((a: any, i: number) => (
                      <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        {a.agent_name}: {a.status || 'error'}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SimulatorWidget
