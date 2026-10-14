// Lists the translation keys that exist in src/locales/*.json but NOT in the translations DB, so they can be pushed to the DB.
// Usage:  node scripts/list-local-only-translations.mjs [--out seo/local-only-translation-keys.json]
// Output: { "<locale>": { "<key>": "<local value>" } }, ready to import into translationStrings. Exits 1 (and prints nothing
// misleading) when the API cannot be reached: an unreachable DB is not the same as "every key is local-only".
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { LOCALES, mergeTranslations } from "./translation-merge-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const outIndex = process.argv.indexOf("--out");
const outFile = outIndex > -1 ? process.argv[outIndex + 1] : null;

const result = {};
let total = 0;
for (const locale of LOCALES) {
  let dict;
  try {
    const res = await fetch(`${BASE_URL}/api/translations/${locale}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dict = await res.json();
  } catch (error) {
    console.error(`Cannot reach ${BASE_URL} for ${locale}: ${error.message}. Nothing to report.`);
    process.exit(1);
  }
  const local = JSON.parse(readFileSync(path.resolve(__dirname, `../src/locales/${locale}.json`), "utf8"));
  const { localOnly } = mergeTranslations(local, dict);
  result[locale] = Object.fromEntries(localOnly.map((k) => [k, local[k]]));
  total += localOnly.length;
}
const json = `${JSON.stringify(result, null, 2)}\n`;
if (outFile) writeFileSync(path.resolve(outFile), json);
else process.stdout.write(json);
console.error(`${total} local-only keys across ${LOCALES.length} locales${outFile ? ` written to ${outFile}` : ""}.`);
