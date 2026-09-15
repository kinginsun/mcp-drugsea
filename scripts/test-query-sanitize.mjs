#!/usr/bin/env node
/**
 * Hermetic test: sanitizeQuery aliases for sales_cn / sales_global.
 * Usage: node scripts/test-query-sanitize.mjs
 */
import { sanitizeQuery } from "../dist/query.js";

let failed = 0;
function check(desc, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? " OK " : "FAIL"}  ${desc}: ${JSON.stringify(got)}`);
  if (!ok) {
    console.log(`      expected: ${JSON.stringify(want)}`);
    failed++;
  }
}

const salesItem = sanitizeQuery("sales_cn", { item: "阿托伐他汀" });
check("sales_cn item→drug_name alias", salesItem.query_aliases, { item: "drug_name" });
check("sales_cn item becomes drug_name", salesItem.query, { drug_name: "阿托伐他汀" });
check("sales_cn item is not ignored", salesItem.query_ignored, []);

const salesProduct = sanitizeQuery("sales_cn", { product: "阿托伐他汀" });
check("sales_cn product→xd_drug_name", salesProduct.query_aliases, { product: "xd_drug_name" });
check("sales_cn product becomes xd_drug_name", salesProduct.query, { xd_drug_name: "阿托伐他汀" });

const salesYear = sanitizeQuery("sales_cn", { year: "2024" });
check("sales_cn year→years", salesYear.query_aliases, { year: "years" });
check("sales_cn year becomes years", salesYear.query, { years: "2024" });

const salesPanel = sanitizeQuery("sales_cn", { drug_name: "阿托伐他汀" });
check("sales_cn drug_name passthrough", salesPanel.query, { drug_name: "阿托伐他汀" });
check("sales_cn drug_name has no alias", salesPanel.query_aliases, {});

try {
  sanitizeQuery("sales_cn", { not_a_field: "阿托伐他汀" });
  console.log("FAIL  sales_cn unknown-only query should throw");
  failed++;
} catch (error) {
  const msg = String(error.message);
  const ok = msg.includes("not_a_field") && msg.includes("sales_cn");
  console.log(`${ok ? " OK " : "FAIL"}  sales_cn unknown-only throws: ${msg.slice(0, 80)}…`);
  if (!ok) failed++;
}

const globalItem = sanitizeQuery("sales_global", { item: "atorvastatin", year: 2019 });
check("sales_global item→drug_name", globalItem.query_aliases, { item: "drug_name", year: "years" });
check("sales_global rewritten query", globalItem.query, { drug_name: "atorvastatin", years: 2019 });

console.log(failed === 0 ? "\nAll query-sanitize checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
