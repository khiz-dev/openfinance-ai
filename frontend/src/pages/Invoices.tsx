import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading } from './Dashboard'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
] as const

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  overdue: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  rejected: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Invoices({ userId }: { userId: number }) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('all')
  const [payingId, setPayingId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = () => {
    Promise.all([api.getInvoices(userId), api.getInvoiceStats(userId), api.getAccounts(userId)])
      .then(([inv, st, acc]) => { setInvoices(inv); setStats(st); setAccounts(acc) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  const handleMarkPaid = async (invoiceId: number, accountId: number) => {
    setPayingId(invoiceId)
    try {
      await api.updateInvoiceStatus(userId, invoiceId, {
        status: 'paid',
        paid_from_account_id: accountId,
      })
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setPayingId(null)
    }
  }

  const handleApprove = async (invoiceId: number) => {
    try {
      await api.updateInvoiceStatus(userId, invoiceId, { status: 'approved' })
      load()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <Loading />

  const filtered = tab === 'all' ? invoices : invoices.filter((i) => i.status === tab)

  const totalPaid = stats?.paid_amount || 0
  const totalPending = stats?.pending_amount || 0
  const totalOverdue = stats?.overdue_amount || 0

  return (
    <div className="space-y-6">
      <Header title="Invoices" subtitle="Track, approve, and pay business invoices" />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Invoices" value={stats?.total || 0} />
        <StatCard label="Paid" value={fmt(totalPaid)} sub={`${stats?.paid_count || 0} invoices`} color="emerald" />
        <StatCard label="Pending" value={fmt(totalPending)} sub={`${stats?.pending_count || 0} invoices`} color="amber" />
        <StatCard label="Overdue" value={fmt(totalOverdue)} sub={`${stats?.overdue_count || 0} invoices`} color="rose" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit shadow-sm overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const count = t.id === 'all' ? invoices.length : invoices.filter((i) => i.status === t.id).length
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label} <span className="text-xs text-gray-400">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400 text-sm">No invoices found{tab !== 'all' ? ` with status "${tab}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-xs text-gray-400 uppercase font-semibold tracking-wider">
            <div className="col-span-1">Invoice</div>
            <div className="col-span-3">Supplier</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-2 text-center">Due Date</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((inv) => {
              const style = STATUS_STYLES[inv.status] || STATUS_STYLES.pending
              const isOverdue = inv.status === 'overdue'
              const isPending = inv.status === 'pending'
              const isApproved = inv.status === 'approved'
              const isExpanded = expanded === inv.id

              return (
                <div key={inv.id}>
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : inv.id)}
                  >
                    <div className="col-span-1">
                      <span className="text-xs font-mono text-gray-500">{inv.invoice_number}</span>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-800">{inv.supplier_name}</p>
                      {inv.supplier_email && <p className="text-xs text-gray-400 truncate">{inv.supplier_email}</p>}
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 line-clamp-2">{inv.description}</p>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmt(inv.amount)}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>{fmtDate(inv.due_date)}</p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {inv.status}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      {isPending && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(inv.id) }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-200"
                        >
                          Approve
                        </button>
                      )}
                      {(isApproved || isPending || isOverdue) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : inv.id) }}
                          disabled={payingId === inv.id}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-200"
                        >
                          {payingId === inv.id ? 'Processing...' : 'Pay'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div
                    className="md:hidden px-4 py-3 space-y-2 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : inv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{inv.supplier_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{inv.invoice_number}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{fmt(inv.amount)}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Due: {fmtDate(inv.due_date)}</p>
                    {(isPending || isApproved || isOverdue) && (
                      <div className="flex gap-2 pt-1">
                        {isPending && (
                          <button onClick={(e) => { e.stopPropagation(); handleApprove(inv.id) }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200">
                            Approve
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : inv.id) }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
                          Pay
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail / Pay panel */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Description</p>
                          <p className="text-gray-700">{inv.description || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Source</p>
                          <p className="text-gray-700 capitalize">{inv.source}</p>
                        </div>
                        {inv.paid_at && (
                          <div>
                            <p className="text-xs text-gray-400">Paid On</p>
                            <p className="text-gray-700">{fmtDate(inv.paid_at)}</p>
                          </div>
                        )}
                        {inv.payment_reference && (
                          <div>
                            <p className="text-xs text-gray-400">Payment Reference</p>
                            <p className="text-gray-700 font-mono text-xs">{inv.payment_reference}</p>
                          </div>
                        )}
                      </div>

                      {inv.status !== 'paid' && inv.status !== 'rejected' && accounts.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-400 mb-2 uppercase font-semibold tracking-wider">Pay from account</p>
                          <div className="flex flex-wrap gap-2">
                            {accounts.filter((a) => a.balance > 0).map((acc) => (
                              <button
                                key={acc.id}
                                onClick={() => handleMarkPaid(inv.id, acc.id)}
                                disabled={payingId === inv.id}
                                className="px-3 py-2 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg text-xs transition-colors text-left"
                              >
                                <span className="font-medium text-gray-800">{acc.name}</span>
                                <span className="text-gray-400 ml-2">{fmt(acc.balance)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color ? colorMap[color] || 'text-gray-900' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
