#!/usr/bin/env node
/**
 * Unit test: enforceRetrievalWindow (offset+limit ≤ 1000 per query condition).
 * Usage: node scripts/test-retrieval-window.mjs
 */
import { enforceRetrievalWindow } from "../dist/api.js";

let failed = 0;
function check(desc, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? " OK " : "FAIL"}  ${desc}: ${JSON.stringify(got)}`);
  if (!ok) {
    console.log(`      expected: ${JSON.stringify(want)}`);
    failed++;
  }
}

check("limit 50 / offset 0 unchanged", enforceRetrievalWindow(50, 0), { limit: 50, offset: 0 });
check("limit 50 / offset 900 unchanged", enforceRetrievalWindow(50, 900), { limit: 50, offset: 900 });
check("limit 50 / offset 980 shrinks to 20", enforceRetrievalWindow(50, 980), { limit: 20, offset: 980 });
check("limit 100 / offset 999 shrinks to 1", enforceRetrievalWindow(100, 999), { limit: 1, offset: 999 });

try {
  enforceRetrievalWindow(50, 1000);
  console.log("FAIL  offset=1000 should throw");
  failed++;
} catch (error) {
  console.log(` OK   offset=1000 throws (${error.name}): ${String(error.message).slice(0, 60)}…`);
}

try {
  enforceRetrievalWindow(50, 5000);
  console.log("FAIL  offset=5000 should throw");
  failed++;
} catch (error) {
  console.log(` OK   offset=5000 throws (${error.name})`);
}

console.log(failed === 0 ? "\nAll retrieval-window checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
