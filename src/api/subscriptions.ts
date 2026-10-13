import { apiJson } from '@/lib/http';

export type Plan = 'free' | 'starter' | 'pro' | 'business';

export interface SubscriptionStatus {
  plan: Plan;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  billingInterval?: 'month' | 'year';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  return apiJson<SubscriptionStatus>('/api/subscriptions/status', { headers: authHeaders(token) });
}

export async function createCheckoutSession(
  token: string,
  plan: 'starter' | 'pro' | 'business',
  interval: 'month' | 'year'
): Promise<{ url: string }> {
  return apiJson<{ url: string }>('/api/subscriptions/checkout', {
    method: 'POST',
    headers: authHeaders(token),
    json: { plan, interval },
  });
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  return apiJson<{ url: string }>('/api/subscriptions/portal', { method: 'POST', headers: authHeaders(token), json: {} });
}
