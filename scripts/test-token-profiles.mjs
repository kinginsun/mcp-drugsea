#!/usr/bin/env node
/**
 * Compare MCP access between saved token profiles (full vs limited_no_sales).
 * Reads tokens.local.env in repo root.
 *
 * Usage:
 *   node scripts/test-token-profiles.mjs
 *   node scripts/test-token-profiles.mjs drugsales yibao
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadTokensFile() {
  const path = join(ROOT, "tokens.local.env");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    env[k.trim()] = rest.join("=").trim();
  }
  return env;
}

async function yaohaiSearch(token, dbname) {
  const base = process.env.YAOHAI_BASE_URL || "https://db3.drugsea.cn/api";
  const res = await fetch(`${base}/g/mcp/yaohai/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dbname,
      query: { drug_name: "阿司匹林" },
      limit: 1,
    }),
  });
  const data = await res.json();
  const ok = data.api_status === "success";
  const total =
    ok && data.content && typeof data.content.total === "number"
      ? data.content.total
      : null;
  const err =
    typeof data.content === "string"
      ? data.content
      : JSON.stringify(data.content ?? data).slice(0, 200);
  return { ok, status: res.status, total, err };
}

async function main() {
  const cfg = loadTokensFile();
  const profiles = [
    { name: "full", token: cfg.YAOHAI_MCP_TOKEN_FULL, note: "全库（含销售）" },
    {
      name: "limited_no_sales",
      token: cfg.YAOHAI_MCP_TOKEN_LIMITED,
      note: "无销售库",
    },
  ];
  const dbs = process.argv.slice(2);
  const targets =
    dbs.length > 0 ? dbs : ["drugsales", "sales_cn", "yibao", "product_cn"];

  console.log(`Base: ${cfg.YAOHAI_BASE_URL || process.env.YAOHAI_BASE_URL}\n`);
  for (const db of targets) {
    console.log(`--- dbname: ${db} ---`);
    for (const p of profiles) {
      if (!p.token) {
        console.log(`  ${p.name}: missing token in tokens.local.env`);
        continue;
      }
      try {
        const r = await yaohaiSearch(p.token, db);
        const status = r.ok ? `OK total=${r.total}` : `FAIL ${r.err}`;
        console.log(`  ${p.name} (${p.note}): ${status}`);
      } catch (e) {
        console.log(`  ${p.name}: ERROR ${e.message}`);
      }
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
