"use client";

import type { ReactNode } from "react";
import { useTr } from "@/b2b/setup/i18n";
import { cn } from "@/lib/utils";

/** An unknown figure: never a guessed zero. The dash is decorative; the words are what assistive tech reads. */
export function Blank() {
  const { tr } = useTr();
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{tr("b2b.finance.na", "not available")}</span>
    </>
  );
}

/** A figure that may be blank or negative. A negative is vermilion AND carries its minus sign, and with `loss` the word too. */
export function Signed({ value, children, loss = false }: { value: number | null; children: ReactNode; loss?: boolean }) {
  const { tr } = useTr();
  if (value === null) return <Blank />;
  const negative = value < 0;
  return (
    <span className={cn(negative && "font-bold text-sig-vermilion-ink")}>
      <span className="whitespace-nowrap">{children}</span>
      {negative && loss && <span className="ml-1.5 text-xs font-bold">{tr("b2b.finance.loss", "loss")}</span>}
    </span>
  );
}
