import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { banksApi } from '../lib/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await banksApi.listAccounts();
      setAccounts(res.data);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    setConnecting(true);
    const state = Math.random().toString(36).substring(7);
    const res = await banksApi.connect(state);
    window.location.href = res.data.auth_url;
  };

  const handleRemoveAccount = async (id: number) => {
    await banksApi.removeAccount(id);
    setAccounts(accounts.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>Capital OS</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.email}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-[var(--color-surface-2)] rounded-lg" />
                  <div className="h-16 bg-[var(--color-surface-2)] rounded-lg" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No bank accounts connected yet</p>
                  <button onClick={handleConnectBank} disabled={connecting}
                    className="px-6 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                    {connecting ? 'Connecting...' : 'Connect UK Bank Account'}
                  </button>
                  <p className="text-xs text-gray-500 mt-3">Powered by TrueLayer Open Banking</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-4 bg-[var(--color-surface-2)] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ background: 'var(--color-primary)', opacity: 0.2 }}>
                          🏦
                        </div>
                        <div>
                          <p className="font-medium">{account.provider_name}</p>
                          <p className="text-sm text-gray-400">{account.account_name || account.account_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-300">{account.status}</span>
                        <button onClick={() => handleRemoveAccount(account.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleConnectBank} disabled={connecting}
                    className="w-full mt-2 py-2 rounded-lg border border-dashed border-[var(--color-border)] text-gray-400 text-sm hover:text-white hover:border-gray-400 transition-all">
                    + Connect another account
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Browse Agents', icon: '🤖', path: '/agents' },
                  { label: 'Create Agent', icon: '✨', path: '/agents/create' },
                  { label: 'My Agents', icon: '📋', path: '/my-agents' },
                ].map(action => (
                  <button key={action.path} onClick={() => navigate(action.path)}
                    className="p-4 bg-[var(--color-surface-2)] rounded-xl text-center hover:bg-[var(--color-border)] transition-colors">
                    <span className="text-2xl mb-2 block">{action.icon}</span>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Your Agents</h2>
              <div className="space-y-3">
                <div className="p-4 bg-[var(--color-surface-2)] rounded-lg">
                  <p className="text-sm text-gray-400">No agents yet</p>
                  <button onClick={() => navigate('/agents')} className="text-xs text-[var(--color-accent)] hover:underline mt-1">
                    Browse marketplace →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}