export const AGENT_ICONS: Record<string, string> = {
  'calculator': '🧮',
  'calendar-clock': '⏰',
  'pie-chart': '📊',
  'shield': '🛡️',
  'bot': '🤖',
  'sparkles': '✨',
  'zap': '⚡',
  'trending-up': '📈',
};

export function getIcon(name: string): string {
  return AGENT_ICONS[name] || '🤖';
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}