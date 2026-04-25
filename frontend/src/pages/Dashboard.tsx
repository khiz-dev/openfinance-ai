import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { banksApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    Promise.all([
      banksApi.listAccounts(),
      banksApi.getBalances(),
      banksApi.getProviders(),
    ]).then(([accRes, balRes, provRes]) => {
      setAccounts(accRes.data);
      setBalances(balRes.data);
      setProviders(provRes.data.providers || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleConnect = async (providerId: string, providerName: string) => {
    setConnecting(true);
    try {
      await banksApi.mockBankConnect(providerId, providerName);
      const [accRes, balRes] = await Promise.all([banksApi.listAccounts(), banksApi.getBalances()]);
      setAccounts(accRes.data);
      setBalances(balRes.data);
      setShowBankPicker(false);
    } catch {
      alert('Failed to connect bank');
    } finally {
      setConnecting(false);
    }
  };

  const handleRemove = async (id: number) => {
    await banksApi.removeAccount(id);
    const [accRes, balRes] = await Promise.all([banksApi.listAccounts(), banksApi.getBalances()]);
    setAccounts(accRes.data);
    setBalances(balRes.data);
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
        {balances && balances.total_balance > 0 && (
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[#8B5CF6] rounded-2xl p-6 mb-6">
            <p className="text-sm text-white/70 mb-1">Total Balance</p>
            <p className="text-4xl font-bold">{formatCurrency(balances.total_balance)}</p>
            <p className="text-sm text-white/60 mt-2">{balances.accounts?.length || 0} accounts connected</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Connected Accounts</h2>
                <button onClick={() => setShowBankPicker(!showBankPicker)}
                  className="text-sm px-3 py-1.5 rounded-lg text-white transition-all"
                  style={{ background: 'var(--color-primary)' }}>
                  {showBankPicker ? 'Cancel' : '+ Connect Bank'}
                </button>
              </div>

              {showBankPicker && (
                <div className="mb-4 p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                  <p className="text-sm text-gray-400 mb-3">Select a UK bank to connect (demo mode):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {providers.map(p => (
                      <button key={p.provider_id} onClick={() => handleConnect(p.provider_id, p.provider_name)}
                        disabled={connecting}
                        className="flex items-center gap-2 p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-all disabled:opacity-50">
                        <span>{p.logo}</span>
                        <span className="text-sm">{p.provider_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-[var(--color-surface-2)] rounded-lg" />
                  <div className="h-16 bg-[var(--color-surface-2)] rounded-lg" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🏦</p>
                  <p className="text-gray-400 mb-4">No bank accounts connected yet</p>
                  <button onClick={() => setShowBankPicker(true)}
                    className="px-6 py-3 rounded-lg font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                    Connect a UK Bank
                  </button>
                  <p className="text-xs text-gray-600 mt-3">Demo mode — no real bank needed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(account => {
                    const bal = balances?.accounts?.find((b: any) => b.account_name === account.account_name);
                    return (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-[var(--color-surface-2)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ background: 'var(--color-surface)' }}>
                            🏦
                          </div>
                          <div>
                            <p className="font-medium">{account.provider_name}</p>
                            <p className="text-sm text-gray-400">{account.account_name || account.account_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {bal && <span className="font-semibold">{formatCurrency(bal.balance)}</span>}
                          <button onClick={() => handleRemove(account.id)}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {balances && balances.accounts?.length > 0 && (
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
            )}
          </div>

          <div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Account Breakdown</h2>
              {balances?.accounts?.length > 0 ? (
                <div className="space-y-3">
                  {balances.accounts.map((b: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium">{b.provider_name}</p>
                        <p className="text-xs text-gray-500">{b.account_name}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(b.balance)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Connect a bank to see breakdown</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}