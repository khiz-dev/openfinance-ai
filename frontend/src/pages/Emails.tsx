import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge, Section } from './Dashboard'

export default function Emails({ userId }: { userId: number }) {
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [connectForm, setConnectForm] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    api.getEmails(userId).then(setEmails).catch(console.error).finally(() => setLoading(false))
  }, [userId])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    try {
      await api.connectEmail(userId, { email_address: connectForm })
      setConnectForm('')
    } catch (err) {
      console.error(err)
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return <Loading />

  const categoryColor = (c: string | null) => {
    switch (c) {
      case 'invoice': return 'amber'
      case 'subscription': return 'indigo'
      case 'reminder': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      <Header title="Email Integration" subtitle="Fake email scanning for invoices and subscriptions" />

      {/* Connect Email */}
      <form onSubmit={handleConnect} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Connect Email (simulated)</label>
          <input
            type="email"
            value={connectForm}
            onChange={(e) => setConnectForm(e.target.value)}
            placeholder="work@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={connecting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
      </form>

      {/* Email List */}
      <Section title={`Inbox (${emails.length} messages)`}>
        <div className="space-y-2">
          {emails.map((email) => (
            <div key={email.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge color={categoryColor(email.category)}>{email.category || 'general'}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{email.subject}</p>
                    <p className="text-xs text-gray-500">{email.sender}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {new Date(email.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
              </button>
              {expanded === email.id && (
                <div className="border-t border-gray-800 px-5 py-4">
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans">{email.body}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
