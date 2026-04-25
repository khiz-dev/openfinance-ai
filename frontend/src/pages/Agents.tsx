import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentsApi } from '../lib/api';
import { getIcon } from '../lib/utils';

interface Agent {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_custom: boolean;
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    agentsApi.list().then(res => setAgents(res.data)).catch(() => setAgents([])).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (agentId: number) => {
    setSubscribing(agentId);
    try {
      await agentsApi.subscribe(agentId);
      navigate(`/agents/${agentId}/chat`);
    } catch {
      alert('Failed to subscribe. Make sure you have a connected bank account.');
    } finally {
      setSubscribing(null);
    }
  };

  const categories = ['All', ...new Set(agents.map(a => a.category))];
  const filtered = filter === 'All' ? agents : agents.filter(a => a.category === filter);

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>Capital OS</h1>
          <span className="text-gray-400">|</span>
          <span className="text-sm">Agent Marketplace</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-white">Dashboard</button>
          <button onClick={() => navigate('/agents/create')} className="text-sm px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'var(--color-primary)' }}>+ Create Agent</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">AI Agent Marketplace</h2>
          <p className="text-gray-400">Choose from pre-built financial AI agents or create your own</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                filter === cat
                  ? 'text-white'
                  : 'bg-[var(--color-surface-2)] text-gray-400 hover:text-white'
              }`}
              style={filter === cat ? { background: 'var(--color-primary)' } : {}}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-[var(--color-surface)] rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(agent => (
              <div key={agent.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: 'var(--color-surface-2)' }}>
                    {getIcon(agent.icon)}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface-2)] text-gray-400">{agent.category}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{agent.name}</h3>
                <p className="text-gray-400 text-sm flex-1 mb-4">{agent.description}</p>
                <button onClick={() => handleSubscribe(agent.id)} disabled={subscribing === agent.id}
                  className="w-full py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                  {subscribing === agent.id ? 'Activating...' : 'Use This Agent'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}