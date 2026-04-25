import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import { Header } from './Dashboard'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat({ userId }: { userId: number }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await api.chat(userId, text, updated.slice(0, -1))
      setMessages([...updated, { role: 'assistant', content: res.reply }])
    } catch (e: any) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <Header title="Ask AI" subtitle="Ask anything about your business finances" />

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-3xl">💬</div>
          <div className="text-center max-w-md">
            <p className="text-lg font-medium text-gray-200">Ask anything about your finances</p>
            <p className="text-sm text-gray-500 mt-2">I have access to all your accounts, transactions, invoices, and suppliers. Ask me about cash flow, expenses, invoices, or anything else.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {[
              'What is our current cash position?',
              'Which invoices are overdue?',
              'What are our top expenses this month?',
              'How much are we spending on SaaS tools?',
            ].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-left bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-200'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="sticky bottom-0 pt-4 pb-2 bg-gray-950">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business finances..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
