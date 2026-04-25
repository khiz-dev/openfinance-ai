import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { Header, Section, Badge, fmt } from './Dashboard'

type Recipient = {
  name: string
  count: number
  total: number
  lastDate: string
}

export default function Payments({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [paymentIntents, setPaymentIntents] = useState<any[]>([])
  const [tab, setTab] = useState<'intents' | 'payment' | 'transfer' | 'dd' | 'recipients'>('intents')
  const [result, setResult] = useState<any>(null)

  const loadAll = () => {
    Promise.all([api.getAccounts(userId), api.getTransactions(userId), api.getPaymentIntents(userId)])
      .then(([a, t, pi]) => { setAccounts(a); setTransactions(t); setPaymentIntents(pi) })
      .catch(console.error)
  }
  useEffect(loadAll, [userId])

  const recipients = useMemo<Recipient[]>(() => {
    const map = new Map<string, { count: number; total: number; lastDate: string }>()
    for (const tx of transactions) {
      if (tx.transaction_type !== 'debit') continue
      const name = (tx.merchant || tx.description || '').trim()
      if (!name) continue
      const existing = map.get(name)
      if (existing) {
        existing.count++
        existing.total += Math.abs(tx.amount)
        if (tx.date > existing.lastDate) existing.lastDate = tx.date
      } else {
        map.set(name, { count: 1, total: Math.abs(tx.amount), lastDate: tx.date })
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [transactions])

  const pendingIntents = paymentIntents.filter((pi) => pi.status === 'pending')

  const TABS: [string, string][] = [
    ['intents', `Payment Intents`],
    ['payment', 'New Payment'],
    ['transfer', 'Transfer'],
    ['dd', 'Direct Debit'],
    ['recipients', 'Recipients'],
  ]

  return (
    <div className="space-y-6">
      <Header title="Payments & Transfers" subtitle="Manage payment intents, transfers, and direct debits" />

      {pendingIntents.length > 0 && tab !== 'intents' && (
        <button
          onClick={() => setTab('intents')}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-sm">⏳</span>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-amber-800">{pendingIntents.length} payment intent{pendingIntents.length !== 1 ? 's' : ''} awaiting action</p>
            <p className="text-xs text-amber-600">Created by AI agents — click to review</p>
          </div>
          <span className="text-amber-500 text-sm">→</span>
        </button>
      )}

      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit overflow-x-auto max-w-full shadow-sm">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id as typeof tab); setResult(null) }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${tab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {label}
            {id === 'intents' && paymentIntents.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === 'intents' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                {paymentIntents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'intents' && <PaymentIntents intents={paymentIntents} userId={userId} onUpdate={loadAll} />}
      {tab === 'payment' && <PaymentForm userId={userId} accounts={accounts} onResult={setResult} />}
      {tab === 'transfer' && <TransferForm userId={userId} accounts={accounts} onResult={setResult} />}
      {tab === 'dd' && <DirectDebitForm userId={userId} accounts={accounts} onResult={setResult} />}
      {tab === 'recipients' && <RecipientsTable recipients={recipients} />}

      {result && (
        <div className={`bg-white border rounded-2xl shadow-sm p-4 ${result.error ? 'border-rose-200' : 'border-emerald-200'}`}>
          {result.error ? (
            <p className="text-rose-600 text-sm">{result.error}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Badge color="green">{result.status}</Badge>
              <span className="text-sm text-gray-600">Instruction #{result.id} — £{fmt(result.amount)}</span>
            </div>
          )}
        </div>
      )}

      <Section title="Account Balances">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
              <p className="text-xs text-gray-400">{a.account_type}</p>
              <p className="text-sm text-gray-700">{a.name}</p>
              <p className={`text-lg font-semibold mt-1 ${a.balance < 0 ? 'text-rose-600' : 'text-gray-900'}`}>£{fmt(a.balance)}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function PaymentIntents({ intents, userId, onUpdate }: { intents: any[]; userId: number; onUpdate: () => void }) {
  const [executingId, setExecutingId] = useState<number | null>(null)

  const handleExecute = async (intentId: number) => {
    setExecutingId(intentId)
    try {
      await api.executePaymentIntent(userId, intentId)
      onUpdate()
    } catch (e) {
      console.error(e)
    } finally {
      setExecutingId(null)
    }
  }

  if (intents.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
          <span className="text-xl">📋</span>
        </div>
        <p className="text-sm text-gray-500 font-medium">No payment intents</p>
        <p className="text-xs text-gray-400">Payment intents are created when AI agents detect invoices or schedule payments.</p>
      </div>
    )
  }

  const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    simulated: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    executed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Payment Intents</p>
        <p className="text-xs text-gray-400">{intents.length} total</p>
      </div>
      <div className="divide-y divide-gray-100">
        {intents.map((pi) => {
          const style = STATUS_STYLES[pi.status] || STATUS_STYLES.pending
          const isPending = pi.status === 'pending'
          return (
            <div key={pi.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-lg">💳</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{pi.payee_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{pi.from_account}</span>
                    {pi.reference && <span className="text-xs text-gray-300">· Ref: {pi.reference}</span>}
                    {pi.agent_run_id && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">AI created</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-semibold text-gray-900">£{Number(pi.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {pi.status === 'simulated' ? 'processed' : pi.status}
                </span>
                {isPending && (
                  <button
                    onClick={() => handleExecute(pi.id)}
                    disabled={executingId === pi.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                  >
                    {executingId === pi.id ? 'Processing...' : 'Execute'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecipientsTable({ recipients }: { recipients: Recipient[] }) {
  if (recipients.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400">No payment recipients found</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Recipient</th>
              <th className="text-center py-3 px-4 font-medium">Payments</th>
              <th className="text-right py-3 px-4 font-medium">Total Sent</th>
              <th className="text-right py-3 px-4 font-medium">Last Payment</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-800 font-medium">{r.name}</td>
                <td className="py-3 px-4 text-center">
                  <Badge color="blue">{r.count}</Badge>
                </td>
                <td className="py-3 px-4 text-right font-medium text-rose-600">£{fmt(r.total)}</td>
                <td className="py-3 px-4 text-right text-gray-400 whitespace-nowrap">
                  {new Date(r.lastDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
        <span>{recipients.length} unique recipient{recipients.length !== 1 ? 's' : ''}</span>
        <span className="font-semibold text-gray-600">Total: £{fmt(recipients.reduce((s, r) => s + r.total, 0))}</span>
      </div>
    </div>
  )
}

function PaymentForm({ userId, accounts, onResult }: { userId: number; accounts: any[]; onResult: (r: any) => void }) {
  const [form, setForm] = useState({ from_account_id: 0, payee_name: '', amount: 0, reference: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (accounts.length) setForm((f) => ({ ...f, from_account_id: accounts[0].id })) }, [accounts])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try { onResult(await api.createPayment(userId, form)) } catch (err: any) { onResult({ error: err.message }) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="From Account" value={form.from_account_id} options={accounts.map((a) => ({ value: a.id, label: `${a.name} (£${a.balance.toFixed(2)})` }))} onChange={(v) => setForm({ ...form, from_account_id: v })} />
        <Input label="Payee Name" value={form.payee_name} onChange={(v) => setForm({ ...form, payee_name: v })} required />
        <NumInput label="Amount" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Input label="Reference" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} />
      </div>
      <Btn submitting={submitting} label="Send Payment" />
    </form>
  )
}

function TransferForm({ userId, accounts, onResult }: { userId: number; accounts: any[]; onResult: (r: any) => void }) {
  const [form, setForm] = useState({ from_account_id: 0, to_account_id: 0, amount: 0, reference: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (accounts.length >= 2) setForm((f) => ({ ...f, from_account_id: accounts[0].id, to_account_id: accounts[1].id }))
  }, [accounts])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try { onResult(await api.createTransfer(userId, form)) } catch (err: any) { onResult({ error: err.message }) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="From Account" value={form.from_account_id} options={accounts.map((a) => ({ value: a.id, label: `${a.name} (£${a.balance.toFixed(2)})` }))} onChange={(v) => setForm({ ...form, from_account_id: v })} />
        <Select label="To Account" value={form.to_account_id} options={accounts.map((a) => ({ value: a.id, label: `${a.name} (£${a.balance.toFixed(2)})` }))} onChange={(v) => setForm({ ...form, to_account_id: v })} />
        <NumInput label="Amount" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Input label="Reference" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} />
      </div>
      <Btn submitting={submitting} label="Transfer Funds" />
    </form>
  )
}

function DirectDebitForm({ userId, accounts, onResult }: { userId: number; accounts: any[]; onResult: (r: any) => void }) {
  const [form, setForm] = useState({ account_id: 0, payee_name: '', amount: 0, frequency: 'monthly', reference: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (accounts.length) setForm((f) => ({ ...f, account_id: accounts[0].id })) }, [accounts])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try { onResult(await api.createDirectDebit(userId, form)) } catch (err: any) { onResult({ error: err.message }) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Account" value={form.account_id} options={accounts.map((a) => ({ value: a.id, label: `${a.name} (£${a.balance.toFixed(2)})` }))} onChange={(v) => setForm({ ...form, account_id: v })} />
        <Input label="Payee Name" value={form.payee_name} onChange={(v) => setForm({ ...form, payee_name: v })} required />
        <NumInput label="Amount" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Input label="Reference" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} />
      </div>
      <Btn submitting={submitting} label="Create Direct Debit" />
    </form>
  )
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
    </div>
  )
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="number" step="0.01" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} required className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Btn({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
      {submitting ? 'Processing...' : label}
    </button>
  )
}
