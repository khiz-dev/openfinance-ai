import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Section, Badge, fmt } from './Dashboard'

export default function Payments({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [tab, setTab] = useState<'payment' | 'transfer' | 'dd'>('payment')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    api.getAccounts(userId).then(setAccounts)
  }, [userId])

  return (
    <div className="space-y-6">
      <Header title="Payments & Transfers" subtitle="Simulated financial actions" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {([['payment', 'Payment'], ['transfer', 'Transfer'], ['dd', 'Direct Debit']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setResult(null) }}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'payment' && <PaymentForm userId={userId} accounts={accounts} onResult={setResult} />}
      {tab === 'transfer' && <TransferForm userId={userId} accounts={accounts} onResult={setResult} />}
      {tab === 'dd' && <DirectDebitForm userId={userId} accounts={accounts} onResult={setResult} />}

      {result && (
        <div className={`bg-gray-900 border rounded-xl p-4 ${result.error ? 'border-rose-500/30' : 'border-emerald-500/30'}`}>
          {result.error ? (
            <p className="text-rose-400 text-sm">{result.error}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Badge color="green">{result.status}</Badge>
              <span className="text-sm text-gray-300">Instruction #{result.id} — £{fmt(result.amount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Current Balances */}
      <Section title="Account Balances">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map((a) => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">{a.account_type}</p>
              <p className="text-sm text-gray-300">{a.name}</p>
              <p className={`text-lg font-semibold mt-1 ${a.balance < 0 ? 'text-rose-400' : 'text-white'}`}>£{fmt(a.balance)}</p>
            </div>
          ))}
        </div>
      </Section>
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
    <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
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
    <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
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
    <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
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
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
    </div>
  )
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="number" step="0.01" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Btn({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
      {submitting ? 'Processing...' : label}
    </button>
  )
}
