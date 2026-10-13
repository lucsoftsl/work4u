import type { SyncState } from "./OfflineProvider";

export type Translate = (key: string, fallback: string) => string;
const identity: Translate = (_key, fallback) => fallback;

export interface BarInput { online: boolean; syncState: SyncState; waitingCount: number; attentionCount: number; lastSync: string | null; storageLow: boolean; clock: (iso: string) => string; t?: Translate }
export interface BarView { tone: "ok" | "syncing" | "offline" | "attention" | "warning"; text: string }

/** Wording for the always-visible status bar (ux-direction §5.3). */
export function statusBarView(i: BarInput): BarView {
  const t = i.t ?? identity;
  const changes = (n: number) =>
    n === 1
      ? t("b2b.tech.bar.changes.one", "{n} change").replace("{n}", String(n))
      : t("b2b.tech.bar.changes.other", "{n} changes").replace("{n}", String(n));
  if (i.attentionCount > 0) {
    return {
      tone: "attention",
      text: i.attentionCount === 1
        ? t("b2b.tech.bar.attention.one", "{n} needs your attention").replace("{n}", String(i.attentionCount))
        : t("b2b.tech.bar.attention.other", "{n} need your attention").replace("{n}", String(i.attentionCount)),
    };
  }
  if (!i.online) {
    return i.waitingCount > 0
      ? { tone: "offline", text: t("b2b.tech.bar.offlineWaiting", "Offline · {changes} waiting").replace("{changes}", changes(i.waitingCount)) }
      : { tone: "offline", text: t("b2b.tech.bar.offline", "Offline") };
  }
  if (i.syncState === "syncing") return { tone: "syncing", text: t("b2b.tech.bar.sending", "Sending {changes}…").replace("{changes}", changes(Math.max(i.waitingCount, 1))) };
  if (i.waitingCount > 0) return { tone: "syncing", text: t("b2b.tech.bar.waitingToSend", "{changes} waiting to send").replace("{changes}", changes(i.waitingCount)) };
  if (i.storageLow) return { tone: "warning", text: t("b2b.tech.bar.storageLow", "Phone storage almost full") };
  return { tone: "ok", text: i.lastSync ? t("b2b.tech.bar.onlineSent", "Online · all sent {time}").replace("{time}", i.clock(i.lastSync)) : t("b2b.tech.bar.online", "Online") };
}
