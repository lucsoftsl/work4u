// Pulls the current translationStrings state from the DB-backed
// GET /api/translations/:locale endpoint and overwrites src/locales/*.json
// with it. Runs as the "prebuild" step (see package.json) so every build —
// including a redeploy — bakes in whatever admins have edited via
// /admin/translations. Never fails the build: if the API is unreachable,
// each locale file is left as-is (whatever was last committed).
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../src/locales");
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const LOCALES = ["en", "fr", "es", "hu", "ro"];
const FETCH_TIMEOUT_MS = 10000;

async function fetchLocale(locale) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/api/translations/${locale}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const dict = await response.json();
    if (!dict || typeof dict !== "object" || Array.isArray(dict)) {
      throw new Error("response was not a flat key/value object");
    }
    return dict;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  let updated = 0;

  for (const locale of LOCALES) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    try {
      const dict = await fetchLocale(locale);
      const sorted = Object.fromEntries(
        Object.entries(dict).sort(([a], [b]) => a.localeCompare(b))
      );
      writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
      updated += 1;
      console.log(`[sync-translations] ${locale}.json <- ${Object.keys(sorted).length} keys from DB`);
    } catch (error) {
      const existingKeyCount = (() => {
        try {
          return Object.keys(JSON.parse(readFileSync(filePath, "utf8"))).length;
        } catch {
          return "unknown";
        }
      })();
      console.warn(
        `[sync-translations] Could not refresh ${locale}.json from ${BASE_URL} (${error.message}). ` +
          `Keeping existing committed file (${existingKeyCount} keys).`
      );
    }
  }

  console.log(`[sync-translations] Done — refreshed ${updated}/${LOCALES.length} locale files from the DB.`);
}

main().catch((error) => {
  // Never block the build on this step — stale committed JSON is an
  // acceptable fallback, an interrupted build is not.
  console.warn("[sync-translations] Unexpected error, continuing build with existing JSON files:", error);
});
