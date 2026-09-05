#!/usr/bin/env node
/**
 * Smoke-test all 12 mcp-drugsea tools via stdio JSON-RPC.
 * Usage: node scripts/test-all-tools.mjs
 * Reads env from process (set YAOHAI_MCP_TOKEN or source .env).
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SERVER = join(ROOT, "dist/index.js");

function loadDotEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    const shadowed = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const [k, ...rest] = t.split("=");
      const v = rest.join("=").trim();
      const key = k.trim();
      if (!process.env[key]) {
        process.env[key] = v;
      } else if (process.env[key] !== v) {
        // An exported value wins over .env (standard dotenv precedence).
        // That is easy to trip over after rotating a token: the old exported
        // value keeps shadowing the updated file. Surface it instead of
        // silently testing with a stale credential.
        shadowed.push(key);
      }
    }
    for (const key of shadowed) {
      const envVal = process.env[key] || "";
      const fileVal = (() => {
        const line = raw.split("\n").find((l) => l.trim().startsWith(`${key}=`));
        return line ? line.slice(line.indexOf("=") + 1).trim() : "";
      })();
      const mask = (s) => (s.length > 8 ? `${s.slice(0, 8)}…${s.slice(-4)}` : `${s.length} chars`);
      console.error(
        `[warn] ${key} from the environment (${mask(envVal)}) overrides .env (${mask(fileVal)}).\n` +
          `       If you rotated this credential, run: unset ${key}`
      );
    }
  } catch {
    // optional
  }
}

loadDotEnv();

let seq = 0;
let buffer = "";
let pendingResolve = null;

const child = spawn("node", [SERVER], {
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

child.stderr.on("data", (d) => {
  const s = d.toString();
  if (s.trim()) process.stderr.write(`[server stderr] ${s}`);
});

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  while (true) {
    const nl = buffer.indexOf("\n");
    if (nl === -1) break;
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (pendingResolve && msg.id === pendingResolve.id) {
      pendingResolve.resolve(msg);
      pendingResolve = null;
    }
  }
});

function rpc(method, params) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingResolve = null;
      reject(new Error(`timeout ${method} id=${id}`));
    }, 120_000);
    pendingResolve = {
      id,
      resolve: (msg) => {
        clearTimeout(timer);
        resolve(msg);
      },
    };
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

function summarize(text, max = 180) {
  const one = text.replace(/\s+/g, " ");
  return one.length > max ? one.slice(0, max) + "…" : one;
}

function firstIdFromSearch(text, source) {
  try {
    const data = JSON.parse(text);
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    const row = items[0];
    if (!row || typeof row !== "object") return null;
    if (row.id) return String(row.id);
    if (row.fields?.id) return String(row.fields.id);
    if (source === "yaohai" && row.fields) {
      for (const v of Object.values(row.fields)) {
        if (typeof v === "string" && v.length > 8) return v;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function callTool(name, arguments_) {
  const msg = await rpc("tools/call", { name, arguments: arguments_ });
  const result = msg.result ?? {};
  const isError = Boolean(result.isError);
  const text = (result.content?.[0]?.text ?? "").trim();
  return { name, isError, text };
}

async function main() {
  if (!process.env.YAOHAI_MCP_TOKEN) {
    console.error("YAOHAI_MCP_TOKEN not set");
    process.exit(1);
  }

  const listMsg = await rpc("tools/list", {});
  const tools = listMsg.result?.tools ?? [];
  console.log(`tools/list: ${tools.length} tools\n`);

  const results = [];
  let yaohaiDetailId = null;
  let productDetailId = null;
  let regDetailId = null;

  const staticCalls = [
    ["yaohai-catalog", { q: "医保" }],
    ["yaohai-search", { dbname: "yibao", query: { item: "阿司匹林" }, limit: 3 }],
    ["yaohai-global-search", { q: "PD-1", limit: 3 }],
    ["product-cn-fields", {}],
    ["product-cn-search", { query: { drug_name: "阿司匹林" }, limit: 3 }],
    ["product-cn-facets", {
      query: { drug_name: "阿司匹林" },
      facets: ["ATC_code", "drug_type"],
    }],
    ["reg-cn-fields", {}],
    ["reg-cn-search", { query: { drug_name: "司美格鲁肽" }, limit: 3 }],
    ["reg-cn-facets", {
      query: { drug_name: "司美格鲁肽" },
      facets: ["rd_status", "drug_type"],
    }],
  ];

  for (const [name, args] of staticCalls) {
    const r = await callTool(name, args);
    results.push(r);
    if (name === "yaohai-search" && !r.isError) {
      yaohaiDetailId = firstIdFromSearch(r.text, "yaohai");
    }
    if (name === "product-cn-search" && !r.isError) {
      productDetailId = firstIdFromSearch(r.text, "product");
    }
    if (name === "reg-cn-search" && !r.isError) {
      regDetailId = firstIdFromSearch(r.text, "reg");
    }
    console.log(
      `${r.isError ? "FAIL" : " OK "} ${name}: ${summarize(r.isError ? r.text : r.text.slice(0, 120))}`
    );
  }

  if (yaohaiDetailId) {
    const r = await callTool("yaohai-detail", { dbname: "yibao", id: yaohaiDetailId });
    results.push(r);
    console.log(`${r.isError ? "FAIL" : " OK "} yaohai-detail: ${summarize(r.text)}`);
  } else {
    results.push({ name: "yaohai-detail", isError: true, text: "skipped: no id from yaohai-search" });
    console.log("SKIP yaohai-detail: no id from yaohai-search");
  }

  if (productDetailId) {
    const r = await callTool("product-cn-detail", { id: productDetailId });
    results.push(r);
    console.log(`${r.isError ? "FAIL" : " OK "} product-cn-detail: ${summarize(r.text)}`);
  } else {
    results.push({ name: "product-cn-detail", isError: true, text: "skipped: no id from product-cn-search" });
    console.log("SKIP product-cn-detail: no id from product-cn-search");
  }

  if (regDetailId) {
    const r = await callTool("reg-cn-detail", { id: regDetailId });
    results.push(r);
    console.log(`${r.isError ? "FAIL" : " OK "} reg-cn-detail: ${summarize(r.text)}`);
  } else {
    results.push({ name: "reg-cn-detail", isError: true, text: "skipped: no id from reg-cn-search" });
    console.log("SKIP reg-cn-detail: no id from reg-cn-search");
  }

  child.stdin.end();

  const passed = results.filter((r) => !r.isError).length;
  const failed = results.filter((r) => r.isError).length;
  console.log(`\n--- Summary: ${passed} passed, ${failed} failed / ${results.length} tool calls ---`);
  if (failed) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => x.isError)) {
      console.log(`  ${r.name}: ${summarize(r.text, 300)}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  child.kill();
  process.exit(1);
});
