"use client";

import { useTr } from "@/b2b/setup/i18n";
import { Banner } from "@/b2b/components/workspace/ui";

/** Margin is only as complete as the data: say how many jobs are missing a price or cost, and offer the way to find them. */
export function DataGapHint({ noPrice, noCost, onShow }: { noPrice: number; noCost: number; onShow: () => void }) {
  const { tr, trn } = useTr();
  const cost = noCost ? trn("b2b.finance.hint.cost", { one: "{n} job has no cost", other: "{n} jobs have no cost" }, noCost) : null;
  const price = noPrice ? trn("b2b.finance.hint.price", { one: "{n} job has no price", other: "{n} jobs have no price" }, noPrice) : null;
  const tail = tr("b2b.finance.hint.tail", "so margin may be higher or lower than shown.");
  const what = cost && price ? tr("b2b.finance.hint.both", "{cost} and {price}", { cost, price }) : (cost ?? price ?? "");
  const sentence = `${what}, ${tail}`;
  return (
    <Banner
      tone="warning"
      action={<button type="button" onClick={onShow} className="min-h-[44px] px-2 text-sm font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent">{tr("b2b.finance.hint.show", "Show them")}</button>}
    >
      {sentence}
    </Banner>
  );
}
