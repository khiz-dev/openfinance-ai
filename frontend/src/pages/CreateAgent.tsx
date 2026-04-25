import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentsApi } from '../lib/api';

const FREQUENCIES = [
  { value: 'on-demand', label: 'On-demand (chat only)' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function CreateAgent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState('on-demand');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await agentsApi.create({
        name: name.trim(),
        description: description.trim() || `Custom agent: ${name}`,
        goal: goal.trim(),
        trigger_frequency: frequency,
      });
      await agentsApi.subscribe(res.data.id);
      navigate(`/agents/${res.data.id}/chat`);
    } catch {
      setError('Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/agents')} className="text-gray-400 hover:text-white transition-colors">←</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>Capital OS</h1>
        <span className="text-gray-400">|</span>
        <span className="text-sm">Create Custom Agent</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Build Your Own Agent</h2>
          <p className="text-gray-400">Describe what you want your AI agent to do and how often it should run.</p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="e.g. Rent Helper, Tax Advisor" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="One-line description of what it does" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What should this agent do? <span className="text-[var(--color-danger)]">*</span>
              </label>
              <textarea value={goal} onChange={e => setGoal(e.target.value)} required rows={5}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                placeholder="Describe the agent's role and tasks in detail. For example: 'Monitor my spending on subscriptions and alert me when a new subscription is detected. Warn me if I'm close to my monthly entertainment budget.'" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">How often should it check?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FREQUENCIES.map(f => (
                  <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      frequency === f.value
                        ? 'border-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] text-gray-400 hover:border-gray-400'
                    }`}
                    style={frequency === f.value ? { borderColor: 'var(--color-primary)', background: 'rgba(108,92,231,0.1)' } : {}}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading || !name.trim() || !goal.trim()}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                {loading ? 'Building agent...' : 'Build & Activate Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}