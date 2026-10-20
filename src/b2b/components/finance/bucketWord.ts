import type { FinancePeriod } from "@/b2b/api/finance";

type Tr = (key: string, fallback: string, vars?: Record<string, string | number>) => string;

/** "day", "week" or "month" in the user's language, for "Revenue and cost by {bucket}". */
export function bucketWord(tr: Tr, period: FinancePeriod): string {
  if (period === "week") return tr("b2b.finance.bucket.week", "week");
  if (period === "month") return tr("b2b.finance.bucket.month", "month");
  return tr("b2b.finance.bucket.day", "day");
}
