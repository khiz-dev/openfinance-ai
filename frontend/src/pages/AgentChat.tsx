import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { agentsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getIcon } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentChat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentIcon, setAgentIcon] = useState('bot');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agentsApi.list().then(res => {
      const agent = res.data.find((a: any) => a.id === Number(agentId));
      if (agent) {
        setAgentName(agent.name);
        setAgentIcon(agent.icon);
      }
    });
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await agentsApi.chat(Number(agentId), userMsg);
      setMessages(m => [...m, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please check that your bank account is still connected.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "How much can I afford for a new car?",
    "What's my average monthly spending?",
    "Am I living within my means?",
    "When did my last salary come in?",
  ];

  return (
    <div className="min-h-screen bg-[var(--color-dark)] flex flex-col">
      <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/agents')} className="text-gray-400 hover:text-white transition-colors">←</button>
        <span className="text-2xl">{getIcon(agentIcon)}</span>
        <div>
          <h1 className="font-semibold">{agentName}</h1>
          <p className="text-xs text-gray-500">Powered by OpenAI GPT-4o</p>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">{getIcon(agentIcon)}</span>
              <h2 className="text-xl font-semibold mb-2">{agentName}</h2>
              <p className="text-gray-400 text-sm max-w-md">Ask anything about your finances using your connected bank data.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {quickQuestions.map((q, i) => (
                <button key={i} onClick={() => setInput(q)}
                  className="text-left p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-gray-300 hover:border-[var(--color-primary)] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'text-white'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
                }`} style={msg.role === 'user' ? { background: 'var(--color-primary)' } : {}}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}