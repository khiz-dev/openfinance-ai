import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge, Section, fmt } from './Dashboard'

type Account = {
  id: number
  name: string
  account_type: string
  balance: number
  currency: string
  provider: string
  purpose: string | null
  [key: string]: any
}

type Transaction = {
  id: number
  account_id: number
  amount: number
  description: string
  category: string
  merchant: string
  transaction_type: string
  date: string
  [key: string]: any
}

type MonthGroup = {
  key: string
  label: string
  transactions: Transaction[]
  credits: number
  debits: number
  net: number
}

const TYPE_BORDERS: Record<string, string> = {
  current: 'border-amber-500/60',
  savings: 'border-emerald-500/60',
  investment: 'border-purple-500/60',
  credit: 'border-rose-500/60',
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  current: 'amber',
  savings: 'green',
  investment: 'blue',
  credit: 'red',
}

const PURPOSE_OPTIONS = [
  { value: 'operations', label: 'Operations' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'tax_reserve', label: 'Tax Reserve' },
  { value: 'savings', label: 'Savings' },
  { value: 'corporate_card', label: 'Corporate Card' },
  { value: 'petty_cash', label: 'Petty Cash' },
]

const PROVIDER_LOGOS: Record<string, string> = {
  'HSBC': '🏦',
  'Barclays': '🏦',
  'Monzo': '💳',
  'Revolut': '💳',
  'American Express': '💳',
  'Lloyds': '🏦',
  'NatWest': '🏦',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function groupByMonth(txns: Transaction[]): MonthGroup[] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txns) {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  const groups: MonthGroup[] = []
  for (const [key, transactions] of map) {
    const [year, month] = key.split('-').map(Number)
    const credits = transactions.filter(t => t.transaction_type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
    const debits = transactions.filter(t => t.transaction_type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
    groups.push({
      key,
      label: `${MONTH_NAMES[month]} ${year}`,
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      credits,
      debits,
      net: credits - debits,
    })
  }
  return groups.sort((a, b) => b.key.localeCompare(a.key))
}

function MonthSection({ group, accounts }: { group: MonthGroup; accounts?: Account[] }) {
  const [open, setOpen] = useState(false)
  const accountMap = accounts ? Object.fromEntries(accounts.map(a => [a.id, a.name])) : null

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800/70 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gray-500 text-xs">{open ? '▾' : '▸'}</span>
          <span className="text-sm font-semibold text-gray-200 truncate">{group.label}</span>
          <span className="text-xs text-gray-500 shrink-0">{group.transactions.length} txn{group.transactions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 md:gap-5 text-xs shrink-0">
          <span className="text-emerald-400">+£{fmt(group.credits)}</span>
          <span className="text-rose-400">-£{fmt(group.debits)}</span>
          <span className={`font-semibold hidden sm:inline ${group.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Net: {group.net >= 0 ? '+' : ''}£{fmt(group.net)}
          </span>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-800 bg-gray-950/50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-4 font-medium">Date</th>
                <th className="text-left py-2 px-4 font-medium">Description</th>
                {accountMap && <th className="text-left py-2 px-4 font-medium">Account</th>}
                <th className="text-left py-2 px-4 font-medium">Category</th>
                <th className="text-left py-2 px-4 font-medium">Type</th>
                <th className="text-right py-2 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {group.transactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2.5 px-4 text-gray-200">{tx.description || tx.merchant || '—'}</td>
                  {accountMap && <td className="py-2.5 px-4 text-gray-400">{accountMap[tx.account_id] || '—'}</td>}
                  <td className="py-2.5 px-4"><Badge color="gray">{tx.category || '—'}</Badge></td>
                  <td className="py-2.5 px-4">
                    <Badge color={tx.transaction_type === 'credit' ? 'green' : 'red'}>{tx.transaction_type}</Badge>
                  </td>
                  <td className={`py-2.5 px-4 text-right font-medium whitespace-nowrap ${
                    tx.transaction_type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}£{fmt(Math.abs(tx.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Accounts({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'all' | 'aggregated'>('all')
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null)
  const [editingPurpose, setEditingPurpose] = useState<number | null>(null)

  const loadData = () => {
    Promise.all([api.getAccounts(userId), api.getTransactions(userId)])
      .then(([a, t]) => { setAccounts(a); setTransactions(t) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [userId])

  const handlePurposeChange = async (accountId: number, purpose: string) => {
    try {
      await api.updateAccountPurpose(userId, accountId, purpose)
      setAccounts(accounts.map(a => a.id === accountId ? { ...a, purpose } : a))
      setEditingPurpose(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <Loading />

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const balanceByType = accounts.reduce<Record<string, number>>((acc, a) => {
    const key = a.account_type.toLowerCase()
    acc[key] = (acc[key] || 0) + a.balance
    return acc
  }, {})

  const now = new Date()
  const thisMonthSpending = transactions
    .filter(t => {
      const d = new Date(t.date)
      return t.transaction_type === 'debit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="space-y-6">
      <Header title="Business Accounts" subtitle="Bank accounts and transaction history" />

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Balance</p>
          <p className={`text-2xl font-bold mt-1 ${totalBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
            £{fmt(totalBalance)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Linked Accounts</p>
          <p className="text-2xl font-bold mt-1 text-white">{accounts.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">This Month's Spending</p>
          <p className="text-2xl font-bold mt-1 text-rose-400">£{fmt(thisMonthSpending)}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {(['all', 'aggregated'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {v === 'all' ? 'All Accounts' : 'Aggregated'}
          </button>
        ))}
      </div>

      {view === 'all' ? (
        <div className="space-y-3">
          {accounts.map(account => {
            const borderColor = TYPE_BORDERS[account.account_type.toLowerCase()] || 'border-gray-700/50'
            const isExpanded = expandedAccount === account.id
            const acctTxns = sortedTransactions.filter(t => t.account_id === account.id)
            const providerIcon = PROVIDER_LOGOS[account.provider] || '🏦'
            const monthGroups = groupByMonth(acctTxns)

            return (
              <div key={account.id} className="space-y-0">
                <button
                  onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                  className={`w-full text-left bg-gray-900 border-2 ${borderColor} rounded-xl p-5 hover:bg-gray-800/50 transition-colors ${
                    isExpanded ? 'rounded-b-none' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg shrink-0">
                        {providerIcon}
                      </div>
                      <div>
                        <p className="text-base font-medium text-gray-100">{account.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-medium text-gray-400">{account.provider}</span>
                          <span className="text-gray-700">·</span>
                          <Badge color={TYPE_BADGE_COLORS[account.account_type.toLowerCase()] || 'gray'}>
                            {account.account_type}
                          </Badge>
                          {account.purpose && (
                            <>
                              <span className="text-gray-700">·</span>
                              <Badge color="amber">{account.purpose.replace(/_/g, ' ')}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-semibold ${account.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                        £{fmt(account.balance)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {acctTxns.length} transaction{acctTxns.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className={`bg-gray-900 border-2 border-t-0 ${borderColor} rounded-b-xl p-4 space-y-4`}>
                    {/* Purpose Editor */}
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Purpose:</span>
                      {editingPurpose === account.id ? (
                        <select
                          value={account.purpose || ''}
                          onChange={e => handlePurposeChange(account.id, e.target.value)}
                          onBlur={() => setEditingPurpose(null)}
                          autoFocus
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">Not set</option>
                          {PURPOSE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setEditingPurpose(account.id) }}
                          className="text-xs text-amber-400 hover:text-amber-300"
                        >
                          {account.purpose ? account.purpose.replace(/_/g, ' ') : 'Assign purpose →'}
                        </button>
                      )}
                    </div>

                    {/* Monthly Grouped Transactions */}
                    {monthGroups.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No transactions found</p>
                    ) : (
                      <div className="space-y-2">
                        {monthGroups.map(g => (
                          <MonthSection key={g.key} group={g} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Breakdown by Account Type">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Current Accounts', key: 'current', color: 'text-amber-400' },
                { label: 'Savings', key: 'savings', color: 'text-emerald-400' },
                { label: 'Investment', key: 'investment', color: 'text-purple-400' },
                { label: 'Credit Cards', key: 'credit', color: 'text-rose-400' },
              ].map(({ label, key, color }) => (
                <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>£{fmt(balanceByType[key] || 0)}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="All Transactions by Month">
            <div className="space-y-2">
              {groupByMonth(sortedTransactions).map(g => (
                <MonthSection key={g.key} group={g} accounts={accounts} />
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
