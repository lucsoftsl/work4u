import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Job, MyJobs } from "@/b2b/api/types";
import type { QueueItem } from "./types";

interface FieldDb extends DBSchema {
  queue: { key: string; value: QueueItem; indexes: { "by-org": string } };
  /** Last good server data for offline reads: today's list per org, each job. */
  cache: { key: string; value: { key: string; savedAt: string; data: unknown } };
  /** Unsent notes/signature name typed on a job screen. */
  drafts: { key: string; value: { key: string; notes: string; signatureName: string; updatedAt: string } };
  meta: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "work4u-b2b-field";
let dbPromise: Promise<IDBPDatabase<FieldDb>> | null = null;

export function getDb(): Promise<IDBPDatabase<FieldDb>> {
  dbPromise ??= openDB<FieldDb>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("queue", { keyPath: "id" }).createIndex("by-org", "orgId");
      db.createObjectStore("cache", { keyPath: "key" });
      db.createObjectStore("drafts", { keyPath: "key" });
      db.createObjectStore("meta", { keyPath: "key" });
    },
  });
  return dbPromise;
}

/** For tests: forget the open handle (after fake-indexeddb is reset). */
export function resetDbHandle() { dbPromise = null; }

type Listener = () => void;
const listeners = new Set<Listener>();
export const subscribeQueue = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const notifyQueue = () => listeners.forEach((l) => l());

export async function listQueue(orgId: string): Promise<QueueItem[]> {
  const rows = await (await getDb()).getAllFromIndex("queue", "by-org", orgId);
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export async function putItem(item: QueueItem) { await (await getDb()).put("queue", item); notifyQueue(); }
export async function deleteItem(id: string) { await (await getDb()).delete("queue", id); notifyQueue(); }

// ---- offline read cache
const todayKey = (orgId: string) => `my-jobs:${orgId}`;
const jobKey = (orgId: string, jobId: string) => `job:${orgId}:${jobId}`;
export async function cacheMyJobs(orgId: string, data: MyJobs) { await (await getDb()).put("cache", { key: todayKey(orgId), savedAt: new Date().toISOString(), data }); }
export async function readMyJobs(orgId: string) { const r = await (await getDb()).get("cache", todayKey(orgId)); return r ? { data: r.data as MyJobs, savedAt: r.savedAt } : null; }
export async function cacheJob<T extends Job>(orgId: string, job: T) { await (await getDb()).put("cache", { key: jobKey(orgId, job.id), savedAt: new Date().toISOString(), data: job }); }
export async function readJob<T extends Job>(orgId: string, jobId: string) { const r = await (await getDb()).get("cache", jobKey(orgId, jobId)); return r ? { data: r.data as T, savedAt: r.savedAt } : null; }

export async function cacheMe<T>(orgId: string, me: T) { await (await getDb()).put("cache", { key: `me:${orgId}`, savedAt: new Date().toISOString(), data: me }); }
export async function readMe<T>(orgId: string): Promise<T | null> { const r = await (await getDb()).get("cache", `me:${orgId}`); return r ? (r.data as T) : null; }

// ---- drafts + meta
export async function saveDraft(orgId: string, jobId: string, notes: string, signatureName: string) {
  await (await getDb()).put("drafts", { key: `${orgId}:${jobId}`, notes, signatureName, updatedAt: new Date().toISOString() });
}
export async function readDraft(orgId: string, jobId: string) { return (await getDb()).get("drafts", `${orgId}:${jobId}`); }
export async function deleteDraft(orgId: string, jobId: string) { await (await getDb()).delete("drafts", `${orgId}:${jobId}`); }
export async function setMeta(key: string, value: unknown) { await (await getDb()).put("meta", { key, value }); }
export async function getMeta<T>(key: string): Promise<T | undefined> { return (await (await getDb()).get("meta", key))?.value as T | undefined; }

/** Sign-out / account switch: nothing of the previous person may stay on the phone. */
export async function clearAllOfflineData() {
  const db = await getDb();
  await Promise.all(["queue", "cache", "drafts", "meta"].map((s) => db.clear(s as "queue")));
  notifyQueue();
}
