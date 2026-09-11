/**
 * Extract the dbs facet (条件筛选) catalog from the drugsea frontend source of truth.
 *
 * Source: frontend/src/routes/more/DBS/components/commonSearch/ConditionSearchPanel.js
 * It hardcodes `conditionFields = { <dbname>: [ { title, queryKey, url, filterType? } ] }`.
 *
 * The facet endpoint pattern is `{api_path}/{queryKey}` and is called as a plain GET
 * with the user's current filters as query params (see keyService.getConditionFilterList
 * -> doGetRequest). This matches the catalog's `api_path` for most dbs, but NOT all —
 * the frontend URLs are the authority, so we keep them verbatim.
 *
 * Usage: node scripts/extract-dbs-facets.mjs [--verify]
 *   --verify   also probe each field against the live API and report status
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { extractCustomFacets } from "./extract-custom-facets.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..");

const FRONTEND_FILE =
  "/Users/randyz/Documents/drugsea/frontend/src/routes/more/DBS/components/commonSearch/ConditionSearchPanel.js";

function loadDotEnv() {
  try {
    const text = require("fs").readFileSync(join(PROJECT_ROOT, ".env"), "utf8");
    const env = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[m[1]] = v;
    }
    return env;
  } catch {
    return {};
  }
}

const src = require("fs").readFileSync(FRONTEND_FILE, "utf8");

// Pull the `const conditionFields = { ... };` object literal.
const startIdx = src.indexOf("const conditionFields = {");
if (startIdx === -1) {
  console.error("FAIL: could not find `const conditionFields = {` in frontend source.");
  process.exit(1);
}
// Brace-match from the opening `{` of the object literal.
const objStart = src.indexOf("{", startIdx);
let depth = 0;
let objEnd = -1;
for (let i = objStart; i < src.length; i++) {
  const ch = src[i];
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) {
      objEnd = i;
      break;
    }
  }
}
if (objEnd === -1) {
  console.error("FAIL: unbalanced braces while parsing conditionFields.");
  process.exit(1);
}
const objLiteral = src.slice(objStart, objEnd + 1);

// Parse in ONE ordered pass, tracking the current dbname section.
//
// Two subtleties that broke earlier attempts:
//   1. `queryKey` values (dosage_form, drug_type, ...) repeat across many dbs, so
//      locating an entry by indexOf(queryKey) attributes it to the FIRST db using that
//      field and silently collapses the rest. Hence: split by section, not by field.
//   2. Entry blocks contain `` url: `${BASE_HOST}/…` `` — that `${…}` has braces, so a
//      `\{[^{}]*\}` block matcher fails. Hence: split on the entry's leading `{`.
//
// The frontend declares some dbnames twice (nmpa_reg_patent); in a JS object literal
// the LAST declaration wins, so we overwrite rather than merge.
const result = {};

const headerRe = /^ {4}([a-z0-9_]+): \[/gm;
const headers = [];
let h;
while ((h = headerRe.exec(objLiteral)) !== null) {
  headers.push({ dbname: h[1], start: h.index, end: headerRe.lastIndex });
}

let entries = 0;
for (let i = 0; i < headers.length; i++) {
  const dbname = headers[i].dbname;
  const sectionText = objLiteral.slice(
    headers[i].end,
    i + 1 < headers.length ? headers[i + 1].start : objLiteral.length,
  );

  // Each entry begins with a `{` at 6-space indent. Drop the pre-first-`{` remainder
  // of the header line, then treat every subsequent chunk as one entry.
  const chunks = sectionText.split(/\n {6}\{/).slice(1);
  const fields = [];

  for (const chunk of chunks) {
    const title = chunk.match(/title:\s*"([^"]+)"/);
    const queryKey = chunk.match(/queryKey:\s*"([^"]+)"/);
    const urlPath = chunk.match(/url:\s*`\$\{BASE_HOST\}([^`]+)`/);
    if (!title || !queryKey || !urlPath) continue;

    const ft = chunk.match(/filterType:\s*"([^"]+)"/);
    fields.push({
      title: title[1],
      queryKey: queryKey[1],
      // What the frontend requests under BASE_HOST (…/api) — the same base the MCP uses.
      // Kept verbatim: for some dbs it does NOT equal the catalog `api_path`
      // (e.g. yzpj_products uses /b/yzpj_products/list/… while api_path is /yzpj/list).
      urlPath: urlPath[1],
      // terms -> facet buckets (value + count)   date -> date-range picker
      // range -> numeric range picker            tree -> hierarchy picker (own endpoint)
      filterType: ft ? ft[1] : "terms",
      showSearchBox: /showSearchBox:\s*true/.test(chunk),
    });
    entries++;
  }

  if (fields.length) result[dbname] = fields;
}

const custom = extractCustomFacets();
for (const [dbname, fields] of Object.entries(custom)) {
  if (result[dbname]) {
    console.error(`FAIL: custom facet db ${dbname} already exists in the /in DBS map.`);
    process.exit(1);
  }
  result[dbname] = fields;
}

// Loss detection: if we parsed fewer entries than the literal contains `url:` lines,
// some entries were silently skipped. Fail loudly rather than emit a short catalog.
const urlCount = (objLiteral.match(/url:\s*`\$\{BASE_HOST\}/g) || []).length;
if (entries !== urlCount) {
  console.error(
    `FAIL: parsed ${entries} entries but found ${urlCount} BASE_HOST urls — parser is dropping entries.`,
  );
  process.exit(1);
}

const dbs = Object.keys(result).sort();
const allFields = dbs.flatMap((k) => result[k]);
const byKind = (kind) => allFields.filter((f) => f.filterType === kind);
const termsCount = byKind("terms").length;

console.log(`dbs with condition filters : ${dbs.length}`);
console.log(`total facet fields         : ${allFields.length}`);
console.log(`  terms  (bucket lists)    : ${termsCount}`);
console.log(`  date   (range picker)    : ${byKind("date").length}`);
console.log(`  range  (numeric picker)  : ${byKind("range").length}`);
console.log(`  tree   (hierarchy picker): ${byKind("tree").length}`);
console.log("");

// Show the terms-capable fields first: those are the ones that answer "what values
// exist and how many records match" — i.e. real facets.
for (const db of dbs) {
  const fields = result[db];
  const terms = fields.filter((f) => f.filterType === "terms");
  const other = fields.filter((f) => f.filterType !== "terms");
  const parts = [];
  if (terms.length) parts.push(`terms: ${terms.map((f) => f.queryKey).join(", ")}`);
  if (other.length) {
    parts.push(
      `other: ${other.map((f) => `${f.queryKey}(${f.filterType})`).join(", ")}`,
    );
  }
  console.log(`  ${db} [${fields.length}]  ${parts.join("  |  ")}`);
}

writeFileSync(
  join(PROJECT_ROOT, "dbs-facets.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(`\nWrote ${join(PROJECT_ROOT, "dbs-facets.json")}`);

/**
 * Emit src/dbs-facets.ts — the terms-only facet catalog consumed by the
 * yaohai-facets MCP tool.
 *
 * Generated, not hand-written. Re-run with `--emit-ts` whenever a
 * ConditionSearchPanel.js (shared /in map or a dedicated page) changes.
 *
 * Scope decisions baked in here:
 *   - terms fields only. date/range/tree are UI pickers, not bucket lists.
 *   - dbs whose only fields are date/range/tree are dropped entirely
 *     (medical_device_beian, medical_device_jinkou_beian).
 *   - Dedicated-route pages (zhaobiao, ct_cn, product_us, …) come from
 *     extract-custom-facets.mjs. Hardcoded SPA lists (sales_cn / sales_global)
 *     are emitted as static_values (no live GET).
 *   - The facet prefix is taken verbatim from the frontend URL rather than derived
 *     from the catalog api_path. The frontend is authoritative.
 */
function emitTypeScript() {
  // db title/category/default_query come from the live catalog so the tool can
  // surface Chinese names and apply required params (drugsales needs groupid).
  let catalogById = new Map();
  const catalogPaths = [
    "/tmp/catalog-live.json",
    "/Users/randyz/Documents/drugsea/backend/drugsea_api/src/data/yaohai_catalog.json",
  ];
  for (const p of catalogPaths) {
    try {
      const cat = JSON.parse(readFileSync(p, "utf8"));
      for (const d of cat.databases ?? []) catalogById.set(d.id, d);
      if (catalogById.size) break;
    } catch {
      /* try next */
    }
  }
  if (!catalogById.size) {
    console.error(
      "WARN: catalog JSON unavailable — emitting without titles/default_query.",
    );
  }

  const q = (s) => JSON.stringify(String(s));

  // Dbs that survive the terms-only scope, computed up front: the header comment
  // quotes the count, and it must match the object actually emitted.
  const included = Object.keys(result)
    .filter((db) => result[db].some((f) => f.filterType === "terms"))
    .sort();

  const lines = [];

  lines.push(`/**`);
  lines.push(` * Facet (条件筛选) catalog — GENERATED FILE.`);
  lines.push(` *`);
  lines.push(` * Source of truth: drugsea frontend ConditionSearchPanel.js`);
  lines.push(` *   /in dbs: more/DBS/components/commonSearch/ConditionSearchPanel.js`);
  lines.push(` *   dedicated pages: scripts/extract-custom-facets.mjs`);
  lines.push(` *   随心汇 drugreg_cn: more/aggs/config/data.js is_condition`);
  lines.push(` *`);
  lines.push(` * Regenerate (do not hand-edit):`);
  lines.push(` *   node scripts/extract-dbs-facets.mjs --emit-ts`);
  lines.push(` *`);
  lines.push(` * Scope: \`terms\` fields only (bucket lists), plus hardcoded SPA lists as`);
  lines.push(` * \`static_values\`. \`date\`/\`range\`/\`tree\` pickers are excluded.`);
  lines.push(` * Prefixes come from the frontend URL. Static-list dbs have prefix "".`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`import type { FacetField } from "./fields.js";`);
  lines.push(``);
  lines.push(`export type DbsFacetEntry = {`);
  lines.push(`  /** Chinese database name, for agent-facing output. */`);
  lines.push(`  title: string;`);
  lines.push(`  /** Catalog category, e.g. 市场准入. */`);
  lines.push(`  category: string;`);
  lines.push(`  /** Facet endpoint prefix; append "/{field}". Empty for static lists. */`);
  lines.push(`  prefix: string;`);
  lines.push(`  /** Aggregatable fields. Keys are what you pass to yaohai-facets. */`);
  lines.push(`  fields: Record<string, FacetField>;`);
  lines.push(`  /** Params the backend requires for this db (merged into every facet query). */`);
  lines.push(`  defaultQuery?: Record<string, string>;`);
  lines.push(`  /** static = hardcoded SPA list (no live GET). */`);
  lines.push(`  source?: "http" | "static";`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`export const DBS_FACET_CATALOG: Record<string, DbsFacetEntry> = {`);

  let fieldTotal = 0;
  for (const db of included) {
    const terms = result[db].filter((f) => f.filterType === "terms");
    fieldTotal += terms.length;
    const cat = catalogById.get(db);

    const httpTerms = terms.filter((f) => f.urlPath);
    const staticOnly = httpTerms.length === 0;
    let prefix = "";
    if (httpTerms.length) {
      const first = httpTerms[0];
      prefix = first.urlPath.slice(0, first.urlPath.length - first.queryKey.length - 1);
      for (const f of httpTerms) {
        const p = f.urlPath.slice(0, f.urlPath.length - f.queryKey.length - 1);
        if (p !== prefix) {
          console.error(`FAIL: ${db} has mixed facet prefixes (${prefix} vs ${p}).`);
          process.exit(1);
        }
      }
    }

    lines.push(`  ${db}: {`);
    lines.push(`    title: ${q(cat?.title ?? db)},`);
    lines.push(`    category: ${q(cat?.category ?? "")},`);
    lines.push(`    prefix: ${q(prefix)},`);
    if (staticOnly) {
      lines.push(`    source: "static",`);
    }
    if (cat?.default_query && Object.keys(cat.default_query).length > 0) {
      lines.push(`    defaultQuery: ${JSON.stringify(cat.default_query)},`);
    }
    lines.push(`    fields: {`);
    for (const f of terms) {
      const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(f.queryKey) ? f.queryKey : q(f.queryKey);
      const extra = Array.isArray(f.staticValues)
        ? `, static_values: ${JSON.stringify(f.staticValues)}`
        : "";
      lines.push(`      ${key}: { title: ${q(f.title)}, filter_type: "multiple"${extra} },`);
    }
    lines.push(`    },`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);
  lines.push(`/** Databases that expose facets, sorted. Handy for validation and tool docs. */`);
  lines.push(`export const DBS_FACET_DBNAME_LIST = Object.keys(DBS_FACET_CATALOG).sort();`);
  lines.push(``);

  const dest = join(PROJECT_ROOT, "src/dbs-facets.ts");
  writeFileSync(dest, lines.join("\n") + "\n");
  console.log(`Wrote ${dest} (${included.length} dbs, ${fieldTotal} terms fields)`);
  return { dbs: included.length, fields: fieldTotal };
}

if (process.argv.includes("--emit-ts")) {
  emitTypeScript();
}

// Optional: live verification against the API.
if (process.argv.includes("--verify")) {
  const dotenv = loadDotEnv();
  const token = process.env.YAOHAI_MCP_TOKEN || dotenv.YAOHAI_MCP_TOKEN;
  // Match src/api.ts getBaseUrl(): YAOHAI_BASE_URL already includes the /api suffix.
  const rawBase =
    process.env.YAOHAI_BASE_URL ||
    dotenv.YAOHAI_BASE_URL ||
    "https://db3.drugsea.cn/api";
  const base = rawBase.replace(/\/+$/, "");
  if (!token) {
    console.error("\n--verify needs YAOHAI_MCP_TOKEN");
    process.exit(1);
  }
  console.log(`\nVerifying against ${base} ...`);
  const rows = [];
  const queue = [];
  for (const db of dbs) {
    for (const f of result[db]) {
      queue.push({ db, field: f.queryKey, url: `${base}${f.urlPath}`, filterType: f.filterType });
    }
  }
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      let status = "?";
      let detail = "";
      let verdict = "unknown";
      try {
        const res = await fetch(item.url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(25000),
        });
        status = String(res.status);
        const text = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch {}
        if (parsed) {
          const list = parsed?.content?.list;
          if (parsed.api_status === "success" && Array.isArray(list)) {
            verdict = "buckets";
            detail = `buckets=${list.length} type=${parsed?.content?.type ?? "?"}`;
          } else if (parsed.api_status === "fail") {
            verdict = "api-fail";
            detail = `code=${parsed?.code ?? "?"} msg=${String(parsed?.content ?? parsed?.msg ?? "").slice(0, 60)}`;
          } else if (Array.isArray(list)) {
            verdict = "buckets";
            detail = `buckets=${list.length}`;
          } else {
            verdict = "other-json";
            detail = JSON.stringify(parsed).slice(0, 70);
          }
        } else if (text.trimStart().startsWith("<")) {
          verdict = "html";
          detail = `html(${text.length}b)`;
        } else {
          verdict = "non-json";
          detail = text.slice(0, 50).replace(/\s+/g, " ");
        }
      } catch (e) {
        verdict = "error";
        detail = `${e.name}: ${String(e.message).slice(0, 50)}`;
      }
      rows.push({ ...item, status, verdict, detail });
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

  // Field-level tally.
  const tally = new Map();
  for (const r of rows) tally.set(r.verdict, (tally.get(r.verdict) || 0) + 1);
  console.log("\n=== FIELD-LEVEL TALLY ===");
  for (const [k, v] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }

  // Per-db summary, restricted to terms fields (the real facets).
  console.log("\n=== PER-DB (terms fields only) ===");
  const byDb = new Map();
  for (const r of rows) {
    if (r.filterType !== "terms") continue;
    if (!byDb.has(r.db)) byDb.set(r.db, []);
    byDb.get(r.db).push(r);
  }
  const dbNames = [...byDb.keys()].sort();
  let fullyOk = 0;
  let partlyOk = 0;
  let noneOk = 0;
  for (const db of dbNames) {
    const rs = byDb.get(db);
    const ok = rs.filter((r) => r.verdict === "buckets");
    const bad = rs.filter((r) => r.verdict !== "buckets");
    if (ok.length === rs.length) fullyOk++;
    else if (ok.length > 0) partlyOk++;
    else noneOk++;
    const label = bad.length
      ? `ok=${ok.length} fail=${bad.length} [${bad.map((r) => `${r.field}:${r.verdict}`).join(", ")}]`
      : `ok=${ok.length}/${rs.length} (all)`;
    console.log(`  ${db.padEnd(30)} ${label}`);
  }
  console.log(`\n  all terms ok : ${fullyOk}`);
  console.log(`  some terms ok: ${partlyOk}`);
  console.log(`  none ok      : ${noneOk}`);

  // Non-bucket responses in detail (excluding expected date/range/tree).
  const badTerms = rows.filter((r) => r.filterType === "terms" && r.verdict !== "buckets");
  if (badTerms.length) {
    console.log("\n=== FAILING terms FIELDS ===");
    for (const r of badTerms) {
      console.log(`  ${r.db}/${r.field} -> ${r.status} ${r.verdict} ${r.detail}`);
    }
  }
  const dateRows = rows.filter((r) => r.filterType !== "terms");
  const dateOk = dateRows.filter((r) => r.verdict === "buckets").length;
  console.log(`\n=== date/range/tree fields: ${dateOk}/${dateRows.length} returned buckets ===`);
  console.log("(expected: date/range/tree are pickers, not bucket lists)");

  writeFileSync("/tmp/dbs-facet-verify.json", JSON.stringify(rows, null, 2));
  console.log("\nFull verification written to /tmp/dbs-facet-verify.json");
}
