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

const TYPE_BORDERS: Record<string, string> = {
  current: 'border-indigo-500/60',
  savings: 'border-emerald-500/60',
  investment: 'border-purple-500/60',
  credit: 'border-rose-500/60',
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  current: 'indigo',
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

function TransactionTable({ transactions, accounts }: { transactions: Transaction[]; accounts?: Account[] }) {
  const accountMap = accounts ? Object.fromEntries(accounts.map((a) => [a.id, a.name])) : null

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No transactions found</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50 text-gray-500 text-xs uppercase tracking-wider">
            <th className="text-left py-2 px-3 font-medium">Date</th>
            <th className="text-left py-2 px-3 font-medium">Description</th>
            {accountMap && <th className="text-left py-2 px-3 font-medium">Account</th>}
            <th className="text-left py-2 px-3 font-medium">Category</th>
            <th className="text-left py-2 px-3 font-medium">Type</th>
            <th className="text-right py-2 px-3 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="py-2.5 px-3 text-gray-200">{tx.description || tx.merchant || '—'}</td>
              {accountMap && <td className="py-2.5 px-3 text-gray-400">{accountMap[tx.account_id] || '—'}</td>}
              <td className="py-2.5 px-3"><Badge color="gray">{tx.category || '—'}</Badge></td>
              <td className="py-2.5 px-3">
                <Badge color={tx.transaction_type === 'credit' ? 'green' : 'red'}>{tx.transaction_type}</Badge>
              </td>
              <td className={`py-2.5 px-3 text-right font-medium whitespace-nowrap ${
                tx.transaction_type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {tx.transaction_type === 'credit' ? '+' : '-'}£{fmt(Math.abs(tx.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
      setAccounts(accounts.map((a) => a.id === accountId ? { ...a, purpose } : a))
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

  return (
    <div className="space-y-6">
      <Header title="Business Accounts" subtitle="Bank accounts and transaction history" />

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {(['all', 'aggregated'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {v === 'all' ? 'All Accounts' : 'Aggregated'}
          </button>
        ))}
      </div>

      {view === 'all' ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const borderColor = TYPE_BORDERS[account.account_type.toLowerCase()] || 'border-gray-700/50'
            const isExpanded = expandedAccount === account.id
            const acctTxns = sortedTransactions.filter((t) => t.account_id === account.id)
            const providerIcon = PROVIDER_LOGOS[account.provider] || '🏦'

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
                              <Badge color="indigo">{account.purpose.replace(/_/g, ' ')}</Badge>
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
                          onChange={(e) => handlePurposeChange(account.id, e.target.value)}
                          onBlur={() => setEditingPurpose(null)}
                          autoFocus
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Not set</option>
                          {PURPOSE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPurpose(account.id) }}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          {account.purpose ? account.purpose.replace(/_/g, ' ') : 'Assign purpose →'}
                        </button>
                      )}
                    </div>
                    <TransactionTable transactions={acctTxns} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Balance</p>
            <p className={`text-3xl font-bold mt-2 ${totalBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
              £{fmt(totalBalance)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{accounts.length} linked accounts</p>
          </div>

          <Section title="Breakdown by Account Type">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Current Accounts', key: 'current', color: 'text-indigo-400' },
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

          <Section title="All Transactions">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <TransactionTable transactions={sortedTransactions} accounts={accounts} />
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
