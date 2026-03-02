import {
  Brush,
  Hammer,
  Sprout,
  Truck,
  Paintbrush,
  Palette,
  Code2,
  PenLine,
  Home,
  Compass,
  MessageSquare,
  User,
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
  cleaning: Paintbrush,
};

const navIconMap: Record<string, LucideIcon> = {
  home: Home,
  explore: Compass,
  messages: MessageSquare,
  profile: User,
};

export function normalizeIconKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveCategoryIcon(iconKey: string): LucideIcon {
  return categoryIconMap[normalizeIconKey(iconKey)] || Brush;
}

export function resolveBottomNavIcon(iconKey: string): LucideIcon {
  return navIconMap[normalizeIconKey(iconKey)] || Home;
}

export function resolveJobToneClass(tone: "cleaning" | "assembly" | "delivery" | "neutral"): string {
  switch (tone) {
    case "cleaning":
      return "bg-sky-100 text-sky-700";
    case "assembly":
      return "bg-orange-100 text-orange-700";
    case "delivery":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function resolveMobileTagClass(tone: "success" | "info" | "warning" | "neutral"): string {
  switch (tone) {
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "info":
      return "bg-blue-100 text-blue-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
