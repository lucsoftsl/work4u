import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Guard: user-visible English must come from a locale key (`t("b2b.x", "English fallback")`), never sit in the markup or in a message
// string. The scanner reads every non-test source file under src/b2b and src/app/(b2b) and reports:
//   - JSX text with letters                      <p>Save</p>
//   - UI attributes with a literal               placeholder="Search", aria-label={cond ? "Open" : "Close"}
//   - sentences (capitalised, with a space) in strings or templates that are not an argument of t()/tr()/plural()/...
// A new hit fails the test. If it is really not user-visible text, add it to ALLOWED with the reason.

const ROOT = path.resolve(__dirname, "..");
const DIRS = [path.join(ROOT, "b2b"), path.join(ROOT, "app/(b2b)"), path.join(ROOT, "components/b2b-auth")];
const FILES = [path.join(ROOT, "components/layout/B2bNotFoundView.tsx")];
const sources = () => [...DIRS.flatMap((d) => walk(d)), ...FILES];

/** `file|text` -> why it may stay. Matching is by file (src-relative, any line) and the exact text. */
const ALLOWED: ReadonlyArray<readonly [file: string, text: string, why: string]> = [
  // brand and technical tokens
  ["b2b/components/PartsReadOnly.tsx", "SKU", "technical token"],
  ["b2b/components/RouteTitle.tsx", "Work4U Field", "product name"],
  // used only when the server sent no message of its own
  ["b2b/lib/job-form.ts", "This job type is archived", "fallback when the server sends no message"],
  ["b2b/lib/job-form.ts", "Invalid reference", "fallback when the server sends no message"],
  ["b2b/components/workspace/OverviewTab.tsx", "GPS", "technical token"],
  ["b2b/components/shell/OpsShell.tsx", "work4u Ops", "product name"],
  ["app/(b2b)/ops/(gated)/page.tsx", "work4u Ops", "product name"],
  ["b2b/components/tech/SyncView.tsx", "MB /", "unit"],
  ["b2b/components/tech/SyncView.tsx", "MB", "unit"],
  // CSS media queries and similar
  ["b2b/components/finance/FinanceJobsList.tsx", "(min-width: 900px)", "media query"],
  ["b2b/setup/clients/ClientsList.tsx", "(min-width: 600px)", "media query"],
  ["b2b/setup/clients/ClientsList.tsx", "(min-width: 900px)", "media query"],
  // the PWA manifest is static JSON served before any language is known
  ["app/(b2b)/tech/manifest.webmanifest/route.ts", "Today's jobs, offline-ready, for field technicians.", "static PWA manifest"],
  // English fallbacks that the use site passes through t(`<key>`, fallback): checked by i18n-tables.test.ts and status-label.test.ts
  // the short English "5 min ago" forms; other languages use Intl.RelativeTimeFormat (tested in format.test.ts / notifications.test.ts)
  ["b2b/components/jobs/format.ts", "${Math.floor(s / 60)} min ago", "English short form"],
  ["b2b/lib/notifications.ts", "${min} min ago", "English short form"],
  // API-client messages for failures with no mapped code: screens show their own translated text for the known codes
  ["b2b/api/client.ts", "Request failed (${res.status})", "technical fallback, never the only text on screen"],
  ["b2b/api/client.ts", "Can't reach the server. Check your connection.", "error.message; screens map code NETWORK to a key"],
  ["b2b/offline/read.ts", "The server did not answer in time.", "internal timeout error; shown through the NETWORK mapping"],
  ["b2b/offline/classify.ts", "Your changes are saved as a draft.", "default argument; callers pass the translated summary"],
  ["b2b/lib/split.ts", "(min-width: ${SPLIT_MIN_PX}px)", "media query"],
  // fallbacks of tables whose use site calls t(`<prefix>.${id}`, fallback); each table is checked by i18n-tables.test.ts or its own test
  ["b2b/components/dashboard/AlertsPanel.tsx", "Critical", "b2b.alert.sev.*"],
  ["b2b/components/dashboard/AlertsPanel.tsx", "Warning", "b2b.alert.sev.*"],
  ["b2b/components/dashboard/AlertsPanel.tsx", "Info", "b2b.alert.sev.*"],
  ["b2b/components/tech/SyncView.tsx", "Waiting", "b2b.sync.status.*"],
  ["b2b/components/tech/SyncView.tsx", "In progress", "b2b.sync.status.*"],
  ["b2b/components/tech/SyncView.tsx", "Failed", "b2b.sync.status.*"],
  ["b2b/components/tech/SyncView.tsx", "Draft", "b2b.sync.status.*"],
  ["b2b/components/workspace/TimelineTab.tsx", "Customer", "b2b.timeline.cat.*"],
  ["b2b/components/workspace/TimelineTab.tsx", "Team", "b2b.timeline.cat.*"],
  ["b2b/components/workspace/TimelineTab.tsx", "System", "b2b.timeline.cat.*"],
  ["b2b/components/workspace/TimelineTab.tsx", "Internal", "b2b.timeline.cat.*"],
  ["b2b/lib/status.ts", "*", "status labels: fallback for b2b.status.job.* (status-label.test.ts)"],
  ["b2b/components/RoleEmptyState.tsx", "*", "empty-state copy: fallback for b2b.empty.* (i18n-tables.test.ts)"],
  ["b2b/components/dashboard/BucketCards.tsx", "*", "bucket names and hints: fallback for b2b.dashboard.bucket* (i18n-tables.test.ts)"],
  ["b2b/components/dashboard/LiveIndicator.tsx", "*", "fallback for b2b.dashboard.live.*"],
  ["b2b/components/shell/OpsShell.tsx", "Live (updates every 5 s)", "fallback for b2b.shell.live.*"],
];

const TRANSLATE_CALLS = /^(t|tr|trn|tx|plural|m|say|fmt|translate|tOf|fallback)$/;
const NEUTRAL_CALLS = /^(cn|clsx|twMerge|cva|describe|it|test|expect|require|import|querySelector|querySelectorAll|getElementById|setItem|getItem|removeItem|addEventListener|removeEventListener|fetch|String|Symbol|useState|createContext|dispatchEvent|matchMedia|replace|startsWith|endsWith|includes|split|join|match|has|get|set|delete|log|warn|error|isB2bError|assert|invariant|Error|JSON|parse|stringify|URLSearchParams|append|encodeURIComponent|Intl|DateTimeFormat|NumberFormat|resolve|relative|existsSync|readFileSync)$/;
const UI_ATTRS = /^(placeholder|aria-label|title|alt|label|description|hint|message|helperText|emptyText|text|aria-description|aria-roledescription|aria-valuetext|confirmLabel|reasonLabel|retryLabel|emptyLabel)$/;
const NEUTRAL_PROPS = /^(className|class|key|id|href|src|type|role|kind|variant|tone|family|treatment|icon|permission|section|labelKey|method|name|value|status|action|code|mime|accept|autoComplete|inputMode|rel|target|htmlFor|testId|queryKey|cls|color|bg|border|fontFamily|style|from|to|path|route|selector|event|cursor|sort|dir|field|scope|namespace|key|ref|locale|lang|tz|timeZone|format)$/;
const NEUTRAL_VARS = /^([A-Z_]*(CLS|CLASS|CLASSES|URL|PATH|KEY|KEYS|ID|RE|REGEX|SELECTOR|EVENT|MIME|STORAGE)[A-Z_]*|[a-z]+(Cls|Class|Classes)|BTN[A-Z_]*)$/;
const KEY = /^b2b\.[\w.\-]+$/;
const SENTENCE = /^[A-Z“"(¿¡].*[a-z]{3,}/;

interface Hit { file: string; line: number; kind: string; text: string }

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.|\.d\.ts|testkit/.test(e.name)) out.push(p);
  }
  return out;
}

function scan(file: string): Hit[] {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const hits: Hit[] = [];
  const seen = new Set<number>();
  const add = (n: ts.Node, kind: string, text: string) => {
    if (seen.has(n.pos)) return;
    seen.add(n.pos);
    hits.push({ file: rel, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, kind, text: text.replace(/\s+/g, " ").trim() });
  };
  const calleeName = (c: ts.CallExpression) => c.expression.getText(sf).split(".").pop() ?? "";

  /** A fallback that sits next to its own locale key: [key, "English"] or { key: "b2b.x", label: "English" }. */
  const pairedWithKey = (n: ts.Node): boolean => {
    const p = n.parent;
    const isKey = (e: ts.Node | undefined) => !!e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && KEY.test(e.text);
    if (ts.isPropertyAssignment(p) && (ts.isStringLiteral(p.name) || ts.isNoSubstitutionTemplateLiteral(p.name)) && KEY.test(p.name.text)) return true; // { "b2b.x": "English" }
    if (ts.isArrayLiteralExpression(p)) return p.elements.some((e) => e !== n && isKey(e));
    if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent)) return p.parent.properties.some((q) => q !== p && ts.isPropertyAssignment(q) && isKey(q.initializer));
    return false;
  };

  /** Inside the arguments of a translate call, or of a call/declaration that never shows text. */
  const quiet = (n: ts.Node): boolean => {
    for (let p = n.parent, c: ts.Node = n; p; c = p, p = p.parent) {
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isTypeNode(p)) return true;
      if (ts.isCallExpression(p)) {
        const name = calleeName(p);
        if (TRANSLATE_CALLS.test(name)) return true;
        if (NEUTRAL_CALLS.test(name) && p.arguments.includes(c as ts.Expression)) return true;
      }
      if (ts.isCaseClause(p) || ts.isElementAccessExpression(p)) return true;
      // server metadata: the English default; <RouteTitle> sets the visible title in the user's language
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && (p.name.text === "metadata" || p.name.text === "viewport")) return true;
      if (ts.isPropertyAssignment(p) && p.name === c) return true;
      if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && NEUTRAL_VARS.test(p.name.text)) return true;
      if (ts.isPropertyAssignment(p) && NEUTRAL_PROPS.test(p.name.getText(sf).replace(/["']/g, ""))) return true;
      if (ts.isJsxAttribute(p)) return !UI_ATTRS.test(p.name.getText(sf));
    }
    return false;
  };
  const staticText = (n: ts.Node) => (ts.isTemplateExpression(n) ? n.head.text + " " + n.templateSpans.map((x) => x.literal.text).join(" ") : (n as ts.StringLiteral).text);

  const visit = (n: ts.Node): void => {
    if (ts.isJsxText(n)) {
      const text = n.getText(sf).replace(/\s+/g, " ").trim();
      if (text && /[A-Za-z]{2,}/.test(text) && !/^[|·•\-–—×+/:,.()&;]+$/.test(text)) add(n, "jsx", text);
    } else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) && !quiet(n) && !pairedWithKey(n)) {
      const s = staticText(n);
      const asAttr = ts.isJsxExpression(n.parent) && ts.isJsxAttribute(n.parent.parent);
      const prose = s.length >= 5 && /\s/.test(s.trim()) && (SENTENCE.test(s.trim()) || (ts.isTemplateExpression(n) && /[A-Za-z]{3,}\s+[A-Za-z]{2,}/.test(s)));
      // a one-word label is only suspicious where text is expected
      const oneWord = /^[A-Z][a-z]{3,}[a-z ]*$/.test(s.trim()) && (asAttr || (ts.isJsxAttribute(n.parent) && UI_ATTRS.test(n.parent.name.getText(sf))) || ts.isBindingElement(n.parent) || ts.isParameter(n.parent) || ts.isArrayLiteralExpression(n.parent) || ts.isConditionalExpression(n.parent) || (ts.isPropertyAssignment(n.parent) && /^(label|title|text|message|hint|description|placeholder|name)$/.test(n.parent.name.getText(sf))));
      if ((prose || oneWord) && !/[<>=;]/.test(s.replace(/\{[a-z]+\}/g, ""))) add(n, ts.isTemplateExpression(n) ? "template" : "string", ts.isTemplateExpression(n) ? n.getText(sf).slice(1, -1) : s);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

const allowed = (h: Hit) => ALLOWED.some(([f, text]) => f === h.file && (text === "*" || text === h.text));

describe("no hard-coded English in the B2B screens", () => {
  const hits = sources().flatMap(scan).filter((h) => !allowed(h));
  it("every visible string goes through t() with a key", () => {
    const report = hits.map((h) => `${h.file}:${h.line} [${h.kind}] ${h.text.slice(0, 110)}`);
    if (process.env.DUMP_HITS) fs.writeFileSync(process.env.DUMP_HITS, report.join("\n"));
    expect(report, "wrap these in t('b2b.…', 'English') and add the key to en/ro/es, or add them to ALLOWED with the reason").toEqual([]);
  });
  it("the allow-list has no dead entries", () => {
    const all = sources().flatMap(scan);
    const dead = ALLOWED.filter(([f, text]) => !all.some((h) => h.file === f && (text === "*" || text === h.text))).map(([f, text]) => `${f} | ${text}`);
    if (process.env.DUMP_HITS) fs.writeFileSync(process.env.DUMP_HITS + ".dead", dead.join("\n"));
    expect(dead).toEqual([]);
  });
});
