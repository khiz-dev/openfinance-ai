import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Badge } from './Dashboard'

const TXN_PRESETS = [
  { label: 'Client Payment', amount: 12750, description: 'CLIENT PAYMENT — Wayne Enterprises', category: 'client_revenue', merchant: 'Wayne Enterprises', type: 'credit' },
  { label: 'Payroll', amount: 28500, description: 'PAYROLL — Staff Salaries', category: 'payroll', merchant: 'Payroll', type: 'debit' },
  { label: 'Office Rent', amount: 3500, description: 'RENT — WeWork Shoreditch', category: 'office_rent', merchant: 'WeWork', type: 'debit' },
  { label: 'AWS Bill', amount: 2340, description: 'SaaS — AWS', category: 'cloud_infrastructure', merchant: 'AWS', type: 'debit' },
  { label: 'Supplier', amount: 2800, description: 'SUPPLIER PAYMENT — CloudTech Solutions', category: 'IT services', merchant: 'CloudTech Solutions', type: 'debit' },
  { label: 'Tax Payment', amount: 12000, description: 'HMRC — Corporation Tax', category: 'tax', merchant: 'HMRC', type: 'debit' },
  { label: 'Transfer In', amount: 15000, description: 'Transfer from Revenue Account', category: 'transfer', merchant: 'Internal', type: 'credit' },
  { label: 'Amex Card', amount: 486, description: 'CARD — British Airways', category: 'business_travel', merchant: 'British Airways', type: 'debit' },
]

const INVOICE_PRESETS = [
  { label: 'IT Services', supplier_name: 'CloudTech Solutions', supplier_email: 'billing@cloudtechsolutions.com', amount: 2800, description: 'IT Support Services', invoice_number: 'CT-SIM-001', due_days: 30 },
  { label: 'Security', supplier_name: 'SecureNet Systems', supplier_email: 'accounts@securenet.co.uk', amount: 1200, description: 'Managed Security Services', invoice_number: 'SN-SIM-001', due_days: 14 },
  { label: 'Cleaning', supplier_name: 'CleanPro Services', supplier_email: 'invoices@cleanpro.co.uk', amount: 680, description: 'Office Cleaning', invoice_number: 'CP-SIM-001', due_days: 30 },
  { label: 'New Vendor', supplier_name: 'Acme Consulting Ltd', supplier_email: 'billing@acmeconsulting.com', amount: 5500, description: 'Strategy Consulting — Phase 1', invoice_number: 'AC-SIM-001', due_days: 7 },
  { label: 'Data Platform', supplier_name: 'DataFlow Analytics', supplier_email: 'invoices@dataflowanalytics.io', amount: 3500, description: 'Data Platform License', invoice_number: 'DF-SIM-001', due_days: 14 },
  { label: 'Hardware', supplier_name: 'Dell Technologies', supplier_email: 'invoices@dell.com', amount: 8900, description: 'Laptop Fleet — 5x Dell XPS', invoice_number: 'DL-SIM-001', due_days: 45 },
]

export function SimulatorWidget({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'transaction' | 'invoice'>('transaction')
  const [accounts, setAccounts] = useState<any[]>([])
  const [txnForm, setTxnForm] = useState({
    account_id: 0, amount: 0, description: '', category: '', merchant: '', transaction_type: 'debit',
  })
  const [invForm, setInvForm] = useState({
    supplier_name: '', supplier_email: '', amount: 0, description: '', invoice_number: '', due_days: 30, status: 'pending',
  })
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getAccounts(userId).then(accs => {
      setAccounts(accs)
      if (accs.length > 0) setTxnForm(f => ({ ...f, account_id: accs[0].id }))
    })
  }, [userId])

  const applyTxnPreset = (p: typeof TXN_PRESETS[number]) => {
    setTxnForm({ ...txnForm, amount: p.amount, description: p.description, category: p.category, merchant: p.merchant, transaction_type: p.type })
  }

  const applyInvPreset = (p: typeof INVOICE_PRESETS[number]) => {
    setInvForm({ ...invForm, supplier_name: p.supplier_name, supplier_email: p.supplier_email, amount: p.amount, description: p.description, invoice_number: p.invoice_number, due_days: p.due_days })
  }

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await api.simulateTransaction({ user_id: userId, ...txnForm })
      setResult({ type: 'transaction', ...res })
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await api.simulateInvoice({ user_id: userId, ...invForm })
      setResult({ type: 'invoice', ...res })
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
    <div className="fixed bottom-5 right-5 z-50 w-[420px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span>⚡</span>
          <span className="text-sm font-semibold text-gray-800">Business Simulator</span>
        </div>
        <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {([['transaction', 'Transaction'], ['invoice', 'Invoice']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setResult(null) }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === id ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {id === 'transaction' ? '💳' : '📄'} {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === 'transaction' ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {TXN_PRESETS.map(p => (
                <button key={p.label} onClick={() => applyTxnPreset(p)}
                  className="px-2 py-1 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-600 text-[11px] rounded-md transition-colors">
                  {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleTxnSubmit} className="space-y-2.5">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account</label>
                <select value={txnForm.account_id} onChange={e => setTxnForm({ ...txnForm, account_id: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (£{a.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (£)</label>
                  <input type="number" step="0.01" value={txnForm.amount || ''} onChange={e => setTxnForm({ ...txnForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={txnForm.transaction_type} onChange={e => setTxnForm({ ...txnForm, transaction_type: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option value="debit">Expense (debit)</option>
                    <option value="credit">Income (credit)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input type="text" value={txnForm.description} onChange={e => setTxnForm({ ...txnForm, description: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <input type="text" value={txnForm.category} onChange={e => setTxnForm({ ...txnForm, category: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. payroll" />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors">
                {submitting ? 'Simulating...' : 'Add Transaction'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {INVOICE_PRESETS.map(p => (
                <button key={p.label} onClick={() => applyInvPreset(p)}
                  className="px-2 py-1 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-600 text-[11px] rounded-md transition-colors">
                  {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleInvSubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Supplier Name</label>
                  <input type="text" value={invForm.supplier_name} onChange={e => setInvForm({ ...invForm, supplier_name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Supplier Email</label>
                  <input type="email" value={invForm.supplier_email} onChange={e => setInvForm({ ...invForm, supplier_email: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (£)</label>
                  <input type="number" step="0.01" value={invForm.amount || ''} onChange={e => setInvForm({ ...invForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Invoice #</label>
                  <input type="text" value={invForm.invoice_number} onChange={e => setInvForm({ ...invForm, invoice_number: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Auto" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due (days)</label>
                  <input type="number" value={invForm.due_days} onChange={e => setInvForm({ ...invForm, due_days: parseInt(e.target.value) || 30 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input type="text" value={invForm.description} onChange={e => setInvForm({ ...invForm, description: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={invForm.status} onChange={e => setInvForm({ ...invForm, status: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors">
                {submitting ? 'Creating...' : 'Create Invoice'}
              </button>
            </form>
          </>
        )}

        {result && (
          <div className={`border rounded-lg p-3 space-y-1.5 ${result.error ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
            {result.error ? (
              <p className="text-rose-600 text-xs">{result.error}</p>
            ) : result.type === 'invoice' ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge color="green">Created</Badge>
                  <span className="text-xs text-gray-600 font-mono">{result.invoice_number}</span>
                </div>
                <p className="text-xs text-emerald-700">{result.supplier_name} — £{Number(result.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-400">Due: {result.due_date ? new Date(result.due_date).toLocaleDateString('en-GB') : '—'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge color="green">#{result.transaction_id}</Badge>
                  <span className="text-xs text-gray-600">New balance: £{result.new_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                </div>
                {result.triggered_agents?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Triggered Agents</p>
                    {result.triggered_agents.map((a: any, i: number) => (
                      <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        🤖 {a.agent_name}: {a.status || 'error'}
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
