// Records WHEN this build's content was last changed, for sitemap lastmod of the static pages (core.xml).
// Source, in order: NEXT_PUBLIC_BUILD_DATE (explicit override), the date of the last git commit, the current time.
// Runs as part of `npm run build`; never fails the build.
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, "../src/data/build-info.generated.json");

function resolveBuiltAt() {
  const override = process.env.NEXT_PUBLIC_BUILD_DATE;
  if (override && Number.isFinite(Date.parse(override))) return { builtAt: new Date(override).toISOString(), source: "env" };
  try {
    const iso = execSync("git log -1 --format=%cI", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (Number.isFinite(Date.parse(iso))) return { builtAt: new Date(iso).toISOString(), source: "git" };
  } catch {
    // not a git checkout (or git missing): fall through
  }
  return { builtAt: new Date().toISOString(), source: "build-time" };
}

try {
  const info = resolveBuiltAt();
  writeFileSync(target, `${JSON.stringify(info, null, 2)}\n`);
  console.log(`[build-info] builtAt ${info.builtAt} (${info.source})`);
} catch (error) {
  console.warn("[build-info] could not write build info:", error.message);
}
