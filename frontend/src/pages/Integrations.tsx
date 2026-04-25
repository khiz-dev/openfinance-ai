import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge, Section, fmt } from './Dashboard'

export default function Integrations({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [emails, setEmails] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connectForm, setConnectForm] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', email: '', payment_account_id: 0, max_auto_pay: '' })

  const loadData = () => {
    Promise.all([api.getAccounts(userId), api.getEmails(userId), api.getSuppliers(userId)])
      .then(([a, e, s]) => { setAccounts(a); setEmails(e); setSuppliers(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [userId])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    try { await api.connectEmail(userId, { email_address: connectForm }); setConnectForm(''); loadData() }
    catch (err) { console.error(err) }
    finally { setConnecting(false) }
  }

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createSupplier(userId, {
        name: supplierForm.name,
        email: supplierForm.email || null,
        payment_account_id: supplierForm.payment_account_id || null,
        max_auto_pay: supplierForm.max_auto_pay ? parseFloat(supplierForm.max_auto_pay) : null,
      })
      setSupplierForm({ name: '', email: '', payment_account_id: 0, max_auto_pay: '' })
      setShowAddSupplier(false)
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDeleteSupplier = async (id: number) => {
    try { await api.deleteSupplier(userId, id); loadData() }
    catch (err) { console.error(err) }
  }

  if (loading) return <Loading />

  const bankAccounts = accounts.filter((a) => ['current', 'savings'].includes(a.account_type?.toLowerCase()))
  const creditAccounts = accounts.filter((a) => a.account_type?.toLowerCase() === 'credit')

  const comingSoon = [
    { name: 'Accounting Software', desc: 'Xero, QuickBooks, FreshBooks', icon: '📊' },
    { name: 'Tax Platform', desc: 'HMRC MTD, TurboTax', icon: '📋' },
    { name: 'Payroll Provider', desc: 'Gusto, Deel, Remote', icon: '💰' },
    { name: 'CRM', desc: 'HubSpot, Salesforce', icon: '📇' },
  ]

  return (
    <div className="space-y-8">
      <Header title="Integrations" subtitle="Connected accounts, suppliers, and tools" />

      {/* Approved Suppliers */}
      <Section title="Approved Suppliers">
        <p className="text-xs text-gray-500 mb-3">Invoices from approved suppliers can be auto-processed by the Invoice Tracker agent.</p>
        {suppliers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-3">
            <div className="divide-y divide-gray-800/50">
              {suppliers.map((s) => {
                const payAccount = accounts.find((a) => a.id === s.payment_account_id)
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{s.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.email && <span className="text-xs text-gray-500">{s.email}</span>}
                          {payAccount && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span className="text-xs text-gray-500">Pays from: {payAccount.name}</span>
                            </>
                          )}
                          {s.max_auto_pay && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span className="text-xs text-gray-500">Max: £{fmt(s.max_auto_pay)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="green">Approved</Badge>
                      <button onClick={() => handleDeleteSupplier(s.id)}
                        className="text-xs text-gray-500 hover:text-rose-400 transition-colors">Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showAddSupplier ? (
          <form onSubmit={handleAddSupplier} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Supplier Name</label>
                <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Acme Supplies Ltd" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="billing@supplier.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Account</label>
                <select value={supplierForm.payment_account_id} onChange={(e) => setSupplierForm({ ...supplierForm, payment_account_id: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                  <option value={0}>Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} (£{fmt(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Auto-Pay (£)</label>
                <input type="number" value={supplierForm.max_auto_pay} onChange={(e) => setSupplierForm({ ...supplierForm, max_auto_pay: e.target.value })}
                  placeholder="5000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={!supplierForm.name}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                Add Supplier
              </button>
              <button type="button" onClick={() => setShowAddSupplier(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddSupplier(true)}
            className="px-4 py-2 border border-dashed border-gray-700 hover:border-gray-600 rounded-lg text-sm text-gray-400 hover:text-gray-300 transition-colors">
            + Add Approved Supplier
          </button>
        )}
      </Section>

      {/* Bank Accounts */}
      <Section title="Linked Bank Accounts">
        {bankAccounts.length === 0 ? (
          <p className="text-sm text-gray-500">No bank accounts linked yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((a) => (
              <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-100">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.provider || 'Sandbox'}</p>
                  </div>
                  <ConnectedDot />
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={a.account_type === 'current' ? 'indigo' : 'green'}>{a.account_type}</Badge>
                  {a.purpose && <Badge color="purple">{a.purpose.replace(/_/g, ' ')}</Badge>}
                </div>
                <p className={`text-lg font-semibold ${a.balance < 0 ? 'text-rose-400' : 'text-white'}`}>£{fmt(a.balance)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Credit Cards */}
      {creditAccounts.length > 0 && (
        <Section title="Business Credit Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditAccounts.map((a) => (
              <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-100">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.provider || 'Sandbox'}</p>
                  </div>
                  <ConnectedDot />
                </div>
                <Badge color="red">Credit</Badge>
                <p className="text-lg font-semibold text-rose-400">£{fmt(Math.abs(a.balance))}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Email */}
      <Section title="Email Providers">
        <div className="space-y-4">
          {emails.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-sm">✉</div>
                <div>
                  <p className="text-sm font-medium text-gray-100">Email Connected</p>
                  <p className="text-xs text-gray-500">{emails.length} messages synced</p>
                </div>
              </div>
              <ConnectedDot />
            </div>
          )}
          <form onSubmit={handleConnect} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Connect business email (simulated)</label>
              <input type="email" value={connectForm} onChange={(e) => setConnectForm(e.target.value)}
                placeholder="accounts@company.com" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={connecting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        </div>
      </Section>

      {/* Coming Soon */}
      <Section title="More Integrations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comingSoon.map((item) => (
            <div key={item.name} className="bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-4 flex items-center gap-4 opacity-60">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg">{item.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-300">{item.name}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <Badge>Coming Soon</Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function ConnectedDot() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs text-emerald-400">Connected</span>
    </div>
  )
}
