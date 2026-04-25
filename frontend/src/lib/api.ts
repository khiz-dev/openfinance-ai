const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Users
  getUsers: () => request<any[]>('/users'),
  getUser: (id: number) => request<any>(`/users/${id}`),

  // Financial
  getSummary: (id: number) => request<any>(`/users/${id}/summary`),
  getTransactions: (id: number) => request<any[]>(`/users/${id}/transactions`),
  getInsights: (id: number) => request<any>(`/users/${id}/insights`),
  getSubscriptions: (id: number) => request<any[]>(`/users/${id}/subscriptions`),
  getAccounts: (id: number) => request<any[]>(`/users/${id}/accounts`),

  // Account purpose
  updateAccountPurpose: (userId: number, accountId: number, purpose: string) =>
    request<any>(`/users/${userId}/accounts/${accountId}/purpose`, {
      method: 'PUT',
      body: JSON.stringify({ purpose }),
    }),

  // Approved Suppliers
  getSuppliers: (userId: number) => request<any[]>(`/users/${userId}/suppliers`),
  createSupplier: (userId: number, data: any) =>
    request<any>(`/users/${userId}/suppliers`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSupplier: (userId: number, supplierId: number) =>
    request<any>(`/users/${userId}/suppliers/${supplierId}`, { method: 'DELETE' }),

  // Agents
  getAllAgents: () => request<any[]>('/agents'),
  getBuiltinAgents: () => request<any[]>('/agents/builtin'),
  getUserAgents: (id: number) => request<any[]>(`/users/${id}/agents`),
  runAgent: (userId: number, agentId: number, extraContext?: Record<string, any>) =>
    request<any>(`/users/${userId}/agents/${agentId}/run`, {
      method: 'POST',
      body: extraContext ? JSON.stringify({ extra_context: extraContext }) : undefined,
    }),
  enableAgent: (userId: number, agentId: number) =>
    request<any>(`/users/${userId}/agents/${agentId}/enable`, { method: 'POST' }),
  disableAgent: (userId: number, agentId: number) =>
    request<any>(`/users/${userId}/agents/${agentId}/disable`, { method: 'POST' }),
  createAgent: (userId: number, data: any) =>
    request<any>(`/users/${userId}/agents`, { method: 'POST', body: JSON.stringify(data) }),
  getAgentRuns: (userId: number) => request<any[]>(`/users/${userId}/agent-runs`),
  getAgentRun: (userId: number, runId: number) => request<any>(`/users/${userId}/agent-runs/${runId}`),
  updateAgentSettings: (userId: number, agentId: number, settings: { execution_mode?: string; requires_approval?: boolean }) =>
    request<any>(`/users/${userId}/agents/${agentId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  approveAction: (userId: number, action: any) =>
    request<any>(`/users/${userId}/agents/approve-action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // Invoices
  getInvoices: (userId: number, status?: string) =>
    request<any[]>(`/users/${userId}/invoices${status ? `?status=${status}` : ''}`),
  getInvoiceStats: (userId: number) =>
    request<any>(`/users/${userId}/invoices/stats/summary`),
  updateInvoiceStatus: (userId: number, invoiceId: number, data: { status: string; paid_from_account_id?: number; payment_reference?: string }) =>
    request<any>(`/users/${userId}/invoices/${invoiceId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Chat
  chat: (userId: number, message: string, history: { role: string; content: string }[] = []) =>
    request<{ reply: string; data_referenced: string[]; suggested_agent?: { id: number; name: string; description: string } | null }>(`/users/${userId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: history }),
    }),

  // Payments
  getPaymentIntents: (userId: number) =>
    request<any[]>(`/users/${userId}/payment-intents`),
  executePaymentIntent: (userId: number, intentId: number) =>
    request<any>(`/users/${userId}/payment-intents/${intentId}/execute`, { method: 'PUT' }),
  createPayment: (userId: number, data: any) =>
    request<any>(`/users/${userId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  createTransfer: (userId: number, data: any) =>
    request<any>(`/users/${userId}/transfers`, { method: 'POST', body: JSON.stringify(data) }),
  createDirectDebit: (userId: number, data: any) =>
    request<any>(`/users/${userId}/direct-debits`, { method: 'POST', body: JSON.stringify(data) }),

  // Emails
  getEmails: (userId: number) => request<any[]>(`/users/${userId}/emails`),
  connectEmail: (userId: number, data: any) =>
    request<any>(`/users/${userId}/email/connect`, { method: 'POST', body: JSON.stringify(data) }),

  // Simulator
  simulateTransaction: (data: any) =>
    request<any>('/simulator/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Audit
  getAuditLogs: (userId: number) => request<any[]>(`/users/${userId}/audit-logs`),
};
