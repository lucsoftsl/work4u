import { api } from './index';

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  billingInterval?: 'month' | 'year';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  const { data } = await api.get('/api/subscriptions/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function createCheckoutSession(
  token: string,
  interval: 'month' | 'year'
): Promise<{ url: string }> {
  const { data } = await api.post(
    '/api/subscriptions/checkout',
    { interval },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  const { data } = await api.post(
    '/api/subscriptions/portal',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
