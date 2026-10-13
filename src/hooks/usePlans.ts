"use client";

import { useEffect, useState } from "react";
import { fetchPlans, NO_BILLING, type PlansResponse } from "@/lib/billing-plans";

let cached: Promise<PlansResponse> | null = null;

/** Public plan availability. `loaded` is false until the call settles; failure resolves to "nothing available". */
export function usePlans(): { plans: PlansResponse; loaded: boolean } {
  const [state, setState] = useState<{ plans: PlansResponse; loaded: boolean }>({ plans: NO_BILLING, loaded: false });
  useEffect(() => {
    let active = true;
    cached ??= fetchPlans();
    void cached.then((plans) => {
      if (active) setState({ plans, loaded: true });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
