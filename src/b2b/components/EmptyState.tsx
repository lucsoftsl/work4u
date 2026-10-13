import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** Role-aware text: say what the viewer can do next, or who to ask when they can't. */
  body?: string;
  action?: ReactNode;
}

/** Shared empty state for ops screens (spec: role-aware empty states). */
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded border border-dashed border-ops-border-strong bg-ops-surface px-6 py-10 text-center">
      {Icon ? <Icon className="mx-auto h-8 w-8 text-ops-ink-subtle" aria-hidden="true" /> : null}
      <p className="mt-3 text-lg font-bold text-ops-ink">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-md text-ops-ink-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
