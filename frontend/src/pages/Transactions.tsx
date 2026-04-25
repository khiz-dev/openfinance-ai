import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge, fmt } from './Dashboard'

export default function Transactions({ userId }: { userId: number }) {
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTransactions(userId).then(setTxns).catch(console.error).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <Header title="Transactions" subtitle={`${txns.length} transactions`} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-4 py-3 text-gray-200">{t.description}</td>
                <td className="px-4 py-3">
                  {t.category && <Badge>{t.category}</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Badge color={t.transaction_type === 'credit' ? 'green' : 'red'}>
                    {t.transaction_type}
                  </Badge>
                </td>
                <td className={`px-4 py-3 text-right font-medium ${t.transaction_type === 'credit' ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {t.transaction_type === 'credit' ? '+' : '-'}£{fmt(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
