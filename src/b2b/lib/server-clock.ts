/**
 * Server-time offset. Field phones often have a wrong clock (hours off), so anything derived from "now" (the work
 * timer, timestamps we send as `clientOccurredAt`) must use the server's clock, not Date.now(). The offset is learned
 * from timestamps the API already returns and adjusted for latency (the server stamped it about mid-flight).
 */
const STORAGE_KEY = "work4u.b2b.serverOffsetMs";
const MAX_RTT_MS = 30_000; // a response that slow tells us nothing precise

let offsetMs = 0;
let known = false;

function load() {
  if (known) return;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const n = raw === null ? NaN : Number(raw);
    if (Number.isFinite(n)) { offsetMs = n; known = true; }
  } catch { /* private mode */ }
}

/** Record that the server clock read `serverIso` at some point between `sentAtMs` and `receivedAtMs` (device clock). */
export function observeServerTime(serverIso: string | null | undefined, sentAtMs: number, receivedAtMs: number = Date.now()): void {
  if (!serverIso) return;
  const server = Date.parse(serverIso);
  const rtt = receivedAtMs - sentAtMs;
  if (!Number.isFinite(server) || rtt < 0 || rtt > MAX_RTT_MS) return;
  offsetMs = server - (sentAtMs + receivedAtMs) / 2;
  known = true;
  try { if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, String(Math.round(offsetMs))); } catch { /* ignore */ }
}

/** Current server time in ms (device clock corrected by the last known offset; the device clock itself until one is known). */
export function serverNow(): number {
  load();
  return Date.now() + offsetMs;
}

export const serverNowIso = (): string => new Date(serverNow()).toISOString();
export const getServerOffsetMs = (): number => { load(); return offsetMs; };
/** Tests only. */
export function resetServerClock(): void { offsetMs = 0; known = false; try { if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }
