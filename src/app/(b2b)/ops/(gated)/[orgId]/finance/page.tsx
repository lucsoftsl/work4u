"use client";

import { Suspense } from "react";
import { FinanceGate } from "@/b2b/components/finance/FinanceGate";
import { FinanceView } from "@/b2b/components/finance/FinanceView";

export default function FinancePage() {
  return (
    <FinanceGate>
      <Suspense fallback={null}>
        <FinanceView />
      </Suspense>
    </FinanceGate>
  );
}
