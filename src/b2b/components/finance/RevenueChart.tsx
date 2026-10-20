"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FinanceSummary } from "@/b2b/api/finance";
import { bucketLabel, buildChart, type ChartBucket } from "@/b2b/lib/finance";
import { formatMoney } from "@/b2b/lib/money";
import { useTr } from "@/b2b/setup/i18n";
import { bucketWord } from "./bucketWord";

// One encoding for money charts (design §2): solid blue bar = earned, hatched dashed bar = expected, vermilion line with square markers = cost.
const EARNED = "#005A8C";
const EXPECTED_INK = "#1A6690";
const EXPECTED_TINT = "#E3F2FB";
const COST = "#A33F00";
const GRID = "#D5D9DF";
const AXIS = "#5F6874";
const TODAY_INK = "#16191D";
const HEIGHT = 280;
const PAD = { top: 26, right: 12, bottom: 30, left: 48 };
const FALLBACK_WIDTH = 720;
const MIN_WIDTH = 280;
const MARKER = 7;
const FONT = 11;

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(Math.max(MIN_WIDTH, Math.round(el.clientWidth) || FALLBACK_WIDTH));
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

const compact = (minor: number, locale: string) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(minor / 100);

/** Indexes of the buckets that carry a cost point. Cost belongs to earned work, so a bucket with only pipeline stays a gap. */
const hasCost = (b: ChartBucket) => !b.empty && (b.cost > 0 || b.earned > 0);

function Legend({ patternId }: { patternId: string }) {
  const { tr } = useTr();
  return (
    <ul aria-label={tr("b2b.finance.legend.label", "Legend")} className="flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs font-bold text-ops-ink">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="14" height="12" focusable="false"><rect width="14" height="12" fill={EARNED} /></svg>
        {tr("b2b.finance.legend.earned", "Earned revenue")}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="14" height="12" focusable="false"><rect x="0.75" y="0.75" width="12.5" height="10.5" fill={`url(#${patternId})`} stroke={EXPECTED_INK} strokeDasharray="3 2" /></svg>
        {tr("b2b.finance.legend.expected", "Expected (pipeline)")}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="20" height="12" focusable="false"><line x1="0" y1="6" x2="20" y2="6" stroke={COST} strokeWidth="2" /><rect x="6.5" y="2.5" width="7" height="7" fill="#fff" stroke={COST} strokeWidth="2" /></svg>
        {tr("b2b.finance.legend.cost", "Cost")}
      </li>
    </ul>
  );
}

export function RevenueChart({ summary, today }: { summary: FinanceSummary; today: string }) {
  const { tr, locale } = useTr();
  const holder = useRef<HTMLDivElement>(null);
  const width = useWidth(holder);
  const uid = useId().replace(/\W/g, "");
  const patternId = `${uid}hatch`;
  const model = useMemo(() => buildChart(summary.series, today, summary.period), [summary.series, summary.period, today]);

  const { currency, period } = summary;
  const n = model.buckets.length;
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = n > 0 ? plotW / n : plotW;
  const barW = Math.max(4, Math.min(44, band * 0.66));
  const x = (i: number) => PAD.left + band * (i + 0.5);
  const y = (v: number) => PAD.top + plotH * (1 - v / model.max);
  const labelEvery = Math.max(1, Math.ceil((period === "month" ? 68 : 46) / band));
  const title = tr("b2b.finance.chart.title", "Revenue and cost by {bucket}", { bucket: bucketWord(tr, period) });
  const desc = tr("b2b.finance.chart.alt", "Earned revenue bars for {from} to {to}, expected pipeline bars after today, and a cost line. A table with the same numbers follows.", {
    from: bucketLabel(summary.from, "day", locale), to: bucketLabel(summary.to, "day", locale),
  });
  const money = (v: number) => formatMoney(v, currency, locale);

  const costRuns = model.buckets.reduce<string[]>((path, b, i) => {
    if (!hasCost(b)) return path;
    const connect = i > 0 && hasCost(model.buckets[i - 1]);
    return [...path, `${connect ? "L" : "M"}${x(i).toFixed(1)} ${y(b.cost).toFixed(1)}`];
  }, []);
  const todayX = model.todayIndex === null ? null : x(model.todayIndex);
  const todayAnchor = todayX !== null && todayX > width - 56 ? "end" : "middle";

  return (
    <div ref={holder} className="space-y-3">
      <Legend patternId={patternId} />
      <svg role="img" aria-labelledby={`${uid}t`} aria-describedby={`${uid}d`} width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block min-h-[280px] max-w-full" fontSize={FONT}>
        <title id={`${uid}t`}>{title}</title>
        <desc id={`${uid}d`}>{desc}</desc>
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={EXPECTED_TINT} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={EXPECTED_INK} strokeWidth="2.5" />
          </pattern>
        </defs>
        {model.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fill={AXIS} fontSize={FONT}>{compact(t, locale)}</text>
          </g>
        ))}
        {model.buckets.map((b, i) => {
          const label = bucketLabel(b.start, period, locale);
          const earnedTop = y(b.earned);
          return (
            <g key={b.key}>
              {b.earned > 0 && (
                <rect data-kind="earned" x={x(i) - barW / 2} y={earnedTop} width={barW} height={y(0) - earnedTop} fill={EARNED}>
                  <title>{`${label}: ${tr("b2b.finance.legend.earned", "Earned revenue")} ${money(b.earned)}`}</title>
                </rect>
              )}
              {b.expected > 0 && (
                <rect data-kind="expected" x={x(i) - barW / 2 + 0.75} y={y(b.earned + b.expected)} width={barW - 1.5} height={earnedTop - y(b.earned + b.expected)} fill={`url(#${patternId})`} stroke={EXPECTED_INK} strokeWidth="1.5" strokeDasharray="3 2">
                  <title>{`${label}: ${tr("b2b.finance.legend.expected", "Expected (pipeline)")} ${money(b.expected)}`}</title>
                </rect>
              )}
              {i % labelEvery === 0 && <text x={x(i)} y={HEIGHT - 10} textAnchor="middle" fill={AXIS} fontSize={FONT}>{label}</text>}
            </g>
          );
        })}
        {costRuns.length > 0 && <path d={costRuns.join(" ")} fill="none" stroke={COST} strokeWidth="2" />}
        {model.buckets.map((b, i) => hasCost(b) && (
          <rect key={b.key} data-kind="cost-marker" x={x(i) - MARKER / 2} y={y(b.cost) - MARKER / 2} width={MARKER} height={MARKER} fill="#fff" stroke={COST} strokeWidth="2">
            <title>{`${bucketLabel(b.start, period, locale)}: ${tr("b2b.finance.legend.cost", "Cost")} ${money(b.cost)}`}</title>
          </rect>
        ))}
        {todayX !== null && (
          <g data-today>
            <line x1={todayX} x2={todayX} y1={PAD.top - 4} y2={HEIGHT - PAD.bottom} stroke={TODAY_INK} strokeDasharray="4 3" />
            <text x={todayX} y={12} textAnchor={todayAnchor} fill={TODAY_INK} fontSize={FONT} fontWeight="700">{tr("b2b.finance.today", "Today")}</text>
          </g>
        )}
      </svg>
      <p className="text-xs text-ops-ink-muted">{tr("b2b.finance.chart.explain", "Solid bars are work already done, counted on the day it was completed. Hatched bars are work still to do, counted on its scheduled day.")}</p>
    </div>
  );
}
