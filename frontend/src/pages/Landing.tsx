import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🏦',
    title: 'Connect UK Banks',
    description: 'Securely link your UK bank accounts via TrueLayer Open Banking. 98% UK bank coverage.',
  },
  {
    icon: '🤖',
    title: 'AI Agents from the Shelf',
    description: 'Use pre-built agents like Affordability Advisor and Payday Monitor to get instant insights.',
  },
  {
    icon: '✨',
    title: 'Build Your Own Agent',
    description: 'Describe what you need — we build the agent. Set goals, triggers, and let it work for you.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Streaming',
    description: 'Get answers from your financial AI agent instantly with streaming responses.',
  },
];

const AGENTS = [
  { name: 'Affordability Agent', desc: 'Can I afford this? Get data-backed answers.', icon: '🧮' },
  { name: 'Payday Monitor', desc: 'Watches for your salary and alerts on arrival or delay.', icon: '⏰' },
  { name: 'Spending Insights', desc: 'Deep-dive into where your money goes.', icon: '📊' },
  { name: 'Budget Guardian', desc: 'Stay on track with category budget alerts.', icon: '🛡️' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-dark)] text-white">
      <nav className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>Capital OS</h1>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
          <Link to="/register" className="text-sm px-4 py-2 rounded-lg text-white transition-all"
            style={{ background: 'var(--color-primary)' }}>
            Get Started
          </Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs mb-6 border"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(0,217,255,0.1)' }}>
          UK Open Banking + AI Agents
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Your financial data,<br />
          <span style={{ color: 'var(--color-accent)' }}>empowered by AI agents</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Connect your UK bank accounts and use AI agents to monitor your finances, answer affordability questions, and get alerts when it matters.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate('/register')}
            className="px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            Start for Free →
          </button>
          <button onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-xl font-semibold border border-[var(--color-border)] text-gray-300 hover:text-white hover:border-gray-400 transition-all">
            Sign In
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Pre-built AI Agents</h2>
        <p className="text-gray-400 text-center mb-10">Ready to use agents powered by your bank data</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AGENTS.map((a, i) => (
            <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex items-start gap-4">
              <span className="text-3xl">{a.icon}</span>
              <div>
                <h3 className="font-semibold mb-1">{a.name}</h3>
                <p className="text-sm text-gray-400">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/register')}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all"
            style={{ background: 'var(--color-primary)' }}>
            Try It Now — Free
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Build your own agent in minutes</h2>
          <p className="text-gray-400 mb-6">No coding required. Just describe what you need and our AI builds it for you.</p>
          <button onClick={() => navigate('/register')}
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            Create Custom Agent →
          </button>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-6 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 Capital OS. Powered by TrueLayer Open Banking.</p>
      </footer>
    </div>
  );
}