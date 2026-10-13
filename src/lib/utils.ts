import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the custom type scale; otherwise `text-label` looks like a text colour
// and silently removes `text-on-fill` from buttons (white text lost on green → contrast failure).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body-lg", "body", "label", "caption", "micro"] }],
      shadow: [{ shadow: ["stamp", "raised", "focus"] }],
      rounded: [{ rounded: ["control", "card", "sheet"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
