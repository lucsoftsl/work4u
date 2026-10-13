import { apiJson } from '@/lib/http';

export type Plan = 'free' | 'starter' | 'pro' | 'business';

/** What a plan offers. `postLimit: null` means unlimited active posts. */
export interface PlanLimits {
  postLimit: number | null;
  expiryDays: number;
  boost: boolean;
  companyFeatures: boolean;
}

export interface PlanLimitsRow extends PlanLimits {
  plan: Plan;
}

export interface SubscriptionStatus {
  plan: Plan;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  billingInterval?: 'month' | 'year';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  /** Set for admins: every feature is available regardless of plan. */
  unlimited?: boolean;
  /** What the user can use right now, as enforced by the server. */
  entitlements?: PlanLimits;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function getPlanLimits(): Promise<PlanLimitsRow[]> {
  const data = await apiJson<{ plans: PlanLimitsRow[] }>('/api/subscriptions/plan-limits', { auth: false });
  return data.plans;
}

export async function updatePlanLimits(token: string, plan: Plan, limits: PlanLimits): Promise<PlanLimitsRow> {
  return apiJson<PlanLimitsRow>(`/api/admin/plans/${plan}`, { method: 'PUT', headers: authHeaders(token), json: limits });
}

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
