// Pulls the current translationStrings state from the DB-backed GET /api/translations/:locale endpoint and MERGES it into
// src/locales/*.json. Runs as the "prebuild" step (see package.json).
//
// Safety rules (these used to be implicit; they are now explicit and tested, see translation-merge-lib.mjs):
//   - DB values override existing keys.
//   - Keys that exist only locally (added in code, not yet in the DB) are never removed.
//   - A blank DB value never overwrites a real local string.
//   - If the API/DB cannot be reached (or answers with something that is not a key/value object) NOTHING is written.
//   - A file is only rewritten when its content actually changes, and what changed is logged.
//   - Never fails the build.
// Flags: --dry-run (log only, write nothing).
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { buildCategoryLabels } from "./category-labels-lib.mjs";
import { LOCALES, describeMerge, mergeTranslations } from "./translation-merge-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../src/locales");
const REPORT_PATH = path.resolve(__dirname, "translation-sync-report.json");
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const FETCH_TIMEOUT_MS = 10000;
const DRY_RUN = process.argv.includes("--dry-run");

async function fetchLocale(locale) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/api/translations/${locale}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const dict = await response.json();
    if (!dict || typeof dict !== "object" || Array.isArray(dict)) throw new Error("response was not a flat key/value object");
    return dict;
  } finally {
    clearTimeout(timeout);
  }
}

const readJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
};

async function main() {
  let updated = 0;
  const report = { generatedAt: new Date().toISOString(), source: BASE_URL, dryRun: DRY_RUN, locales: {} };

  for (const locale of LOCALES) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    try {
      const dict = await fetchLocale(locale);
      const local = readJson(filePath);
      const result = mergeTranslations(local, dict);
      console.log(`[sync-translations] ${describeMerge(locale, result)}`);
      report.locales[locale] = { added: result.added, changed: result.changed, ignoredBlank: result.ignoredBlank, localOnly: result.localOnly };
      const next = `${JSON.stringify(result.merged, null, 2)}\n`;
      let current = "";
      try { current = readFileSync(filePath, "utf8"); } catch { /* new file */ }
      if (next !== current && !DRY_RUN) {
        writeFileSync(filePath, next);
        updated += 1;
      }
    } catch (error) {
      console.warn(
        `[sync-translations] Could not reach ${BASE_URL} for ${locale} (${error.message}). ` +
          `Nothing written: keeping ${Object.keys(readJson(filePath)).length} keys in ${locale}.json as they are.`
      );
    }
  }

  if (Object.keys(report.locales).length > 0 && !DRY_RUN) {
    // Keys that only exist locally: hand this to whoever maintains the translations DB (or run list-local-only-translations.mjs).
    try { writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`); } catch { /* report is optional */ }
  }

  // Derived file used by category search (see category-labels-lib.mjs). Regenerated from whatever JSON is on disk.
  if (!DRY_RUN) {
    try {
      const dicts = Object.fromEntries(LOCALES.map((l) => [l, readJson(path.join(LOCALES_DIR, `${l}.json`))]));
      const out = `${JSON.stringify(buildCategoryLabels(dicts), null, 1)}\n`;
      const target = path.resolve(__dirname, "../src/data/category-labels.generated.json");
      let current = "";
      try { current = readFileSync(target, "utf8"); } catch { /* new file */ }
      if (out !== current) writeFileSync(target, out);
    } catch (error) {
      console.warn("[sync-translations] Could not write category labels:", error.message);
    }
  }

  console.log(`[sync-translations] Done: ${DRY_RUN ? "dry run, nothing written" : `${updated}/${LOCALES.length} locale files rewritten`}.`);
}

main().catch((error) => {
  // Never block the build on this step: stale committed JSON is an acceptable fallback, an interrupted build is not.
  console.warn("[sync-translations] Unexpected error, continuing build with existing JSON files:", error);
});
