import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const banksApi = {
  getProviders: () => api.get('/banks/providers'),
  listAccounts: () => api.get('/banks/accounts'),
  getBalances: () => api.get('/banks/balances'),
  removeAccount: (id: number) => api.delete(`/banks/accounts/${id}`),
  getTransactions: (accountId: number, days?: number) =>
    api.get('/banks/transactions', { params: { account_id: accountId, days: days || 30 } }),
  mockBankConnect: (providerId: string, providerName: string) =>
    api.post('/banks/bank-connect', null, { params: { provider_id: providerId, provider_name: providerName } }),
};

export const agentsApi = {
  list: () => api.get('/agents'),
  create: (data: { name: string; description: string; goal: string; trigger_frequency?: string; trigger_config?: any }) =>
    api.post('/agents', data),
  subscribe: (agentId: number, config?: any) =>
    api.post('/agents/subscribe', { agent_id: agentId, config }),
  myAgents: () => api.get('/agents/my'),
  unsubscribe: (agentId: number) => api.delete(`/agents/${agentId}/unsubscribe`),
  chat: (agentId: number, message: string, model?: string) =>
    api.post(`/agents/${agentId}/chat`, { message, model: model || 'gpt-4o' }),
};

export default api;