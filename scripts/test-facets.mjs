/**
 * End-to-end test of the yaohai-facets MCP tool over stdio.
 *
 * Exercises every branch of the handler: discovery (all + one db), fetch
 * (unfiltered + filtered), and each error path (unknown dbname, unknown field,
 * fields-without-dbname, non-facet db).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DBS_FACET_CATALOG } from "../dist/dbs-facets.js";

const require = createRequire(import.meta.url);
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  try {
    const text = readFileSync(join(PROJECT_ROOT, ".env"), "utf8");
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

const EXPECTED_DB_COUNT = Object.keys(DBS_FACET_CATALOG).length;
const EXPECTED_FIELD_COUNT = Object.values(DBS_FACET_CATALOG).reduce(
  (n, e) => n + Object.keys(e.fields).length,
  0,
);
const dotenv = loadDotEnv();
const env = { ...process.env };
for (const [k, v] of Object.entries(dotenv)) {
  // Warn if the shell exports a different value that would shadow .env.
  if (process.env[k] && process.env[k] !== v) {
    console.error(`WARN: exported ${k} shadows .env (unset it if you rotated the credential)`);
  }
  env[k] = v;
}

// Silence the npm update check: this suite asserts yaohai-facets behaviour, and
// the check would add a live registry round-trip plus nondeterministic stderr
// noise (stdio is inherited below). The update check has its own hermetic
// suite: scripts/test-update-check.mjs.
env.YAOHAI_MCP_UPDATE_CHECK = "0";

const child = spawn("node", [join(PROJECT_ROOT, "dist/index.js")], {
  env,
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const pending = new Map();
let nextId = 1;

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

function send(method, params) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(payload + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method} (id ${id})`));
      }
    }, 60000);
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function toolText(msg) {
  const text = msg?.result?.content?.[0]?.text;
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let failures = 0;
function check(label, cond, detail) {
  const mark = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "facet-e2e", version: "1.0.0" },
  });
  notify("notifications/initialized", {});

  // --- tool is registered ---
  const tools = await send("tools/list", {});
  const names = (tools.result?.tools ?? []).map((t) => t.name);
  check("yaohai-facets registered", names.includes("yaohai-facets"), `${names.length} tools total`);
  check(
    "yaohai-global-search still present (not clobbered)",
    names.includes("yaohai-global-search"),
  );

  // --- discovery: all databases ---
  const all = toolText(await send("tools/call", { name: "yaohai-facets", arguments: {} }));
  check("discovery(all) reports catalog db count", all?.facet_capable_databases === EXPECTED_DB_COUNT, `got ${all?.facet_capable_databases} expected ${EXPECTED_DB_COUNT}`);
  check("discovery(all) reports catalog field count", all?.total_facet_fields === EXPECTED_FIELD_COUNT, `got ${all?.total_facet_fields} expected ${EXPECTED_FIELD_COUNT}`);
  check("discovery(all) lists databases array", Array.isArray(all?.databases) && all.databases.length === EXPECTED_DB_COUNT);
  check("discovery includes zhaobiao", all?.databases?.some((d) => d.dbname === "zhaobiao"));
  check("discovery includes sales_cn as static", all?.databases?.find((d) => d.dbname === "sales_cn")?.source === "static");
  const yibaoRow = all?.databases?.find((d) => d.dbname === "yibao");
  check("yibao present with Chinese title", yibaoRow?.title === "医保目录", yibaoRow?.title);
  check(
    "yibao fields from discovery",
    JSON.stringify(yibaoRow?.fields) === JSON.stringify(["province", "drug_type", "insurance_level", "std_catalog_version"]),
    JSON.stringify(yibaoRow?.fields),
  );

  // --- discovery: one database ---
  const one = toolText(
    await send("tools/call", { name: "yaohai-facets", arguments: { dbname: "yibao" } }),
  );
  check("discovery(one) returns yibao facets", one?.facet_count === 4, `got ${one?.facet_count}`);
  check("discovery(one) includes prefix", one?.facet_prefix === "/yibao/eslist", one?.facet_prefix);
  check("discovery(one) has titles", one?.facets?.province?.title === "医保地区", one?.facets?.province?.title);

  // --- fetch: unfiltered buckets ---
  const unfiltered = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "yibao", fields: ["drug_type"] },
    }),
  );
  const dt = unfiltered?.distributions?.drug_type;
  check("fetch unfiltered succeeds", dt?.success === true, JSON.stringify(dt)?.slice(0, 120));
  const totalUnfiltered = (dt?.items ?? []).reduce((n, i) => n + (i.count || 0), 0);
  check("fetch unfiltered returns buckets", (dt?.items?.length ?? 0) >= 3, `${dt?.items?.length} buckets`);
  console.log(`      drug_type buckets: ${JSON.stringify(dt?.items?.map((i) => `${i.value}=${i.count}`))}`);

  // --- fetch: filtered buckets must differ from unfiltered ---
  const filtered = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: {
        dbname: "yibao",
        fields: ["insurance_level"],
        query: { province: "江西" },
      },
    }),
  );
  const il = filtered?.distributions?.insurance_level;
  check("fetch filtered succeeds", il?.success === true, JSON.stringify(il)?.slice(0, 120));
  const totalFiltered = (il?.items ?? []).reduce((n, i) => n + (i.count || 0), 0);
  console.log(`      insurance_level | province=江西: ${JSON.stringify(il?.items?.map((i) => `${i.value}=${i.count}`))}`);
  check(
    "filter narrows the result set",
    totalFiltered > 0 && totalFiltered < 97725,
    `filtered total ${totalFiltered} vs unfiltered 125687`,
  );
  check("query echoed back", JSON.stringify(filtered?.query_applied) === JSON.stringify({ province: "江西" }));

  // --- fetch: multiple fields in one call ---
  const multi = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "jiyao", fields: ["province", "drug_type", "dosage_form"] },
    }),
  );
  const multiOk = ["province", "drug_type", "dosage_form"].filter(
    (f) => multi?.distributions?.[f]?.success === true,
  );
  check("multi-field fetch all succeed", multiOk.length === 3, `${multiOk.length}/3`);
  check("multi-field total_fields correct", multi?.total_fields === 3, `got ${multi?.total_fields}`);

  // --- fetch: a db with a non-/eslist prefix (yzpj_products uses /b/.../list) ---
  const yzpj = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "yzpj_products", fields: ["latest_status"] },
    }),
  );
  check(
    "yzpj_products (prefix /b/yzpj_products/list) works",
    yzpj?.distributions?.latest_status?.success === true,
    JSON.stringify(yzpj?.distributions?.latest_status)?.slice(0, 140),
  );

  // --- dedicated-route: zhaobiao live GET ---
  const zb = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "zhaobiao", fields: ["bid_type"] },
    }),
  );
  check(
    "zhaobiao facet succeeds",
    zb?.distributions?.bid_type?.success === true,
    JSON.stringify(zb?.distributions?.bid_type)?.slice(0, 140),
  );
  check("zhaobiao returns buckets", (zb?.distributions?.bid_type?.items?.length ?? 0) >= 2);

  // --- dedicated-route: product_us live GET ---
  const us = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "product_us", fields: ["ApplyType"] },
    }),
  );
  check(
    "product_us facet succeeds",
    us?.distributions?.ApplyType?.success === true,
    JSON.stringify(us?.distributions?.ApplyType)?.slice(0, 140),
  );

  // --- static SPA lists: sales_cn (no HTTP) ---
  const sales = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "sales_cn", fields: ["drug_type", "ATC_code"] },
    }),
  );
  check("sales_cn drug_type is static", sales?.distributions?.drug_type?.source === "static");
  check(
    "sales_cn drug_type lists 化药",
    (sales?.distributions?.drug_type?.items ?? []).some((i) => i.value === "化药"),
  );
  check(
    "sales_cn ATC uses letter:中文",
    (sales?.distributions?.ATC_code?.items ?? []).some((i) => String(i.value).startsWith("C:")),
  );
  check("sales_cn static count is null", sales?.distributions?.drug_type?.items?.[0]?.count === null);

  // --- dedicated-route: china_new_drugs 创新药研究报告 ---
  const cndDisc = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "china_new_drugs" },
    }),
  );
  check(
    "china_new_drugs discovery title is 创新药研究报告",
    cndDisc?.title === "创新药研究报告",
    cndDisc?.title,
  );
  check(
    "china_new_drugs discovery prefix is /b/new/drug/cn/list",
    cndDisc?.facet_prefix === "/b/new/drug/cn/list",
    cndDisc?.facet_prefix,
  );
  check(
    "china_new_drugs discovery lists SPA fields",
    JSON.stringify(Object.keys(cndDisc?.facets ?? {})) ===
      JSON.stringify([
        "rd_status",
        "kind",
        "drug_type",
        "target",
        "indication",
        "market",
      ]),
    JSON.stringify(Object.keys(cndDisc?.facets ?? {})),
  );
  const cnd = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "china_new_drugs", fields: ["rd_status", "kind", "market"] },
    }),
  );
  check(
    "china_new_drugs rd_status facet succeeds",
    cnd?.distributions?.rd_status?.success === true,
    JSON.stringify(cnd?.distributions?.rd_status)?.slice(0, 140),
  );
  check(
    "china_new_drugs rd_status lists 研究中",
    (cnd?.distributions?.rd_status?.items ?? []).some((i) => i.value === "研究中" && i.count > 0),
    JSON.stringify(cnd?.distributions?.rd_status?.items)?.slice(0, 180),
  );
  check(
    "china_new_drugs rd_status lists 已批准",
    (cnd?.distributions?.rd_status?.items ?? []).some((i) => i.value === "已批准" && i.count > 0),
    JSON.stringify(cnd?.distributions?.rd_status?.items)?.slice(0, 180),
  );
  check(
    "china_new_drugs kind lists 全新实体",
    (cnd?.distributions?.kind?.items ?? []).some((i) => i.value === "全新实体" && i.count > 0),
    JSON.stringify(cnd?.distributions?.kind?.items)?.slice(0, 180),
  );
  check(
    "china_new_drugs market lists NMPA",
    (cnd?.distributions?.market?.items ?? []).some((i) => i.value === "NMPA" && i.count > 0),
    JSON.stringify(cnd?.distributions?.market?.items)?.slice(0, 180),
  );

  // --- dedicated-route: drugreg_cn aggs filter ---
  const drc = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "drugreg_cn", fields: ["drug_type"] },
    }),
  );
  check(
    "drugreg_cn facet succeeds",
    drc?.distributions?.drug_type?.success === true,
    JSON.stringify(drc?.distributions?.drug_type)?.slice(0, 140),
  );

  // --- dedicated-route: product_eu ---
  const eu = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "product_eu", fields: ["drug_type"] },
    }),
  );
  check(
    "product_eu facet succeeds",
    eu?.distributions?.drug_type?.success === true,
    JSON.stringify(eu?.distributions?.drug_type)?.slice(0, 140),
  );

  // --- dedicated-route: generic_cn 仿制药立项调研 (SPA 上市国家 / 剂型) ---
  const genDisc = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "generic_cn" },
    }),
  );
  check(
    "generic_cn discovery title is 仿制药立项调研",
    genDisc?.title === "仿制药立项调研",
    genDisc?.title,
  );
  check(
    "generic_cn discovery lists SPA fields",
    JSON.stringify(Object.keys(genDisc?.facets ?? {})) ===
      JSON.stringify([
        "market",
        "dosage_form",
        "target",
        "indication",
        "is_nme",
        "first_approve_year",
        "ATC_code",
      ]),
    JSON.stringify(Object.keys(genDisc?.facets ?? {})),
  );
  const gen = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "generic_cn", fields: ["market", "dosage_form"] },
    }),
  );
  check(
    "generic_cn market facet succeeds",
    gen?.distributions?.market?.success === true,
    JSON.stringify(gen?.distributions?.market)?.slice(0, 180),
  );
  check(
    "generic_cn market lists FDA",
    (gen?.distributions?.market?.items ?? []).some((i) => i.value === "FDA" && i.count > 0),
    JSON.stringify(gen?.distributions?.market?.items)?.slice(0, 180),
  );
  check(
    "generic_cn dosage_form facet succeeds",
    gen?.distributions?.dosage_form?.success === true,
    JSON.stringify(gen?.distributions?.dosage_form)?.slice(0, 120),
  );

  // --- defaultQuery merge: drugsales needs groupid=205 ---
  const ds = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "drugsales", fields: ["drug_type"] },
    }),
  );
  check(
    "drugsales facet succeeds",
    ds?.distributions?.drug_type?.success === true,
    JSON.stringify(ds?.distributions?.drug_type)?.slice(0, 120),
  );
  check(
    "drugsales defaultQuery(groupid=205) merged into query",
    ds?.query_applied?.groupid === "205",
    JSON.stringify(ds?.query_applied),
  );

  // Caller-supplied values must still win over per-db defaults.
  const dsOverride = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "drugsales", fields: ["drug_type"], query: { groupid: "999" } },
    }),
  );
  check(
    "caller query overrides defaultQuery",
    dsOverride?.query_applied?.groupid === "999",
    JSON.stringify(dsOverride?.query_applied),
  );

  // --- error: unknown dbname ---
  const unknownDb = toolText(
    await send("tools/call", { name: "yaohai-facets", arguments: { dbname: "nope_db", fields: ["x"] } }),
  );
  check("unknown dbname -> supported:false", unknownDb?.supported === false);
  check("unknown dbname -> actionable hint", typeof unknownDb?.hint === "string" && unknownDb.hint.length > 20);

  // --- error: product_cn is not dbs-route ---
  const productCn = toolText(
    await send("tools/call", {
      name: "yaohai-facets",
      arguments: { dbname: "product_cn", fields: ["ATC_code"] },
    }),
  );
  check("product_cn routed to dedicated tool", productCn?.supported === false);
  check(
    "product_cn hint mentions product-cn-facets",
    String(productCn?.hint).includes("product-cn-facets"),
  );

  // --- error: unknown field, with valid list ---
  const badField = await send("tools/call", {
    name: "yaohai-facets",
    arguments: { dbname: "yibao", fields: ["item", "bogus"] },
  });
  const badFieldMsg = badField?.result?.content?.[0]?.text ?? "";
  check("unknown field -> isError", badField?.result?.isError === true);
  check("unknown field message names the bad fields", badFieldMsg.includes("item") && badFieldMsg.includes("bogus"), badFieldMsg.slice(0, 100));
  check("unknown field message lists valid fields", badFieldMsg.includes("insurance_level"), badFieldMsg.slice(0, 160));

  // --- error: fields without dbname ---
  const noDb = await send("tools/call", { name: "yaohai-facets", arguments: { fields: ["province"] } });
  check("fields without dbname -> isError", noDb?.result?.isError === true);
  check(
    "fields without dbname -> explains discovery mode",
    String(noDb?.result?.content?.[0]?.text).includes("Omit"),
  );

  // --- error: empty fields array rejected by schema ---
  const emptyFields = await send("tools/call", {
    name: "yaohai-facets",
    arguments: { dbname: "yibao", fields: [] },
  });
  check("empty fields array -> isError", emptyFields?.result?.isError === true);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  child.kill();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test harness error:", e);
  child.kill();
  process.exit(1);
});
