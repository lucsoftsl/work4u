import { CalendarCheck, CircleCheck, CircleSlash, Coffee, MapPinCheck, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamStatus } from "@/b2b/api/types";
import { FAMILY_CLASSES, TEAM_STATUS_LABEL, type Family, type Treatment } from "@/b2b/lib/status";

const META: Record<TeamStatus, { family: Family; treatment: Treatment; icon: LucideIcon }> = {
  AVAILABLE: { family: "green", treatment: "tint", icon: CircleCheck },
  ASSIGNED: { family: "blue", treatment: "outline", icon: CalendarCheck },
  TRAVELLING: { family: "sky", treatment: "tint", icon: Truck },
  ON_SITE: { family: "blue", treatment: "solid", icon: MapPinCheck },
  BREAK: { family: "orange", treatment: "tint", icon: Coffee },
  OFFLINE: { family: "slate", treatment: "outline", icon: CircleSlash },
};

/** Team availability chip: icon + text + colour (never colour alone). */
export function TeamStatusChip({ status, className }: { status: TeamStatus; className?: string }) {
  const m = META[status] ?? META.OFFLINE;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-bold", FAMILY_CLASSES[m.family][m.treatment], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {TEAM_STATUS_LABEL[status] ?? status}
    </span>
  );
}
