import {
  Brush,
  Hammer,
  Sprout,
  Truck,
  Paintbrush,
  Palette,
  Code2,
  PenLine,
  Zap,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  palette: Palette,
  code2: Code2,
  penline: PenLine,
  paintbrush: Paintbrush,
  hammer: Hammer,
  sprout: Sprout,
  design: Brush,
  labor: Hammer,
  gardening: Sprout,
  delivery: Truck,
  moving: Truck,
  cleaning: Paintbrush,
  electrical: Zap,
  repairs: Wrench,
};

export function normalizeIconKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveCategoryIcon(iconKey: string): LucideIcon {
  return categoryIconMap[normalizeIconKey(iconKey)] || Brush;
}

type JobTone = "cleaning" | "assembly" | "delivery" | "neutral";
type TagTone = "success" | "info" | "warning" | "neutral";

/** Category tag on a job row: soft tone background + full tone text (all pairs are AA, design-tokens §7.1). */
export function resolveJobToneClass(tone: JobTone): string {
  switch (tone) {
    case "cleaning":
      return "bg-info-soft text-info";
    case "assembly":
      return "bg-warning-soft text-warning";
    case "delivery":
      return "bg-success-soft text-success";
    default:
      return "bg-sunken text-ink-muted";
  }
}

export function resolveMobileTagClass(tone: TagTone): string {
  switch (tone) {
    case "success":
      return "bg-success-soft text-success";
    case "info":
      return "bg-info-soft text-info";
    case "warning":
      return "bg-warning-soft text-warning";
    default:
      return "bg-sunken text-ink-muted";
  }
}
