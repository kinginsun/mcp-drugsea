#!/usr/bin/env node
/**
 * Sync src/index.ts's PACKAGE_VERSION constant with the package version.
 *
 * Why this exists: the MCP server reports its version to clients from the
 * PACKAGE_VERSION constant in src/index.ts. If it drifts from package.json,
 * clients see a stale version string. publish.sh calls this on every release.
 *
 * Idempotency contract (important — a past release aborted here):
 *   Re-running after an aborted release finds the constant ALREADY holding the
 *   target version. That is a no-op SUCCESS, not a failure. So "constant
 *   missing" is detected by testing for its presence, never by comparing
 *   whether the file content changed — a no-op replace and a missing constant
 *   look identical under that comparison.
 *
 * Usage:
 *   node scripts/sync-version.mjs --target 0.3.0            # write the file
 *   node scripts/sync-version.mjs --target 0.3.0 --check    # read-only probe
 *
 * stdout (single token, machine-readable):
 *   ALREADY=<v>   constant already equals target (no write needed)
 *   SET=<v>       constant was updated to target
 *   WOULD=<a>><b> --check mode: would change a to b
 * Exit codes: 0 success/idempotent, 1 constant missing or bad args.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET_FILE = join(ROOT, "src/index.ts");

// Matches both quote styles so a future reformat does not silently break sync.
const CONSTANT_RE = /PACKAGE_VERSION\s*=\s*["']([^"']+)["']/;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// --- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const targetIdx = argv.indexOf("--target");
if (targetIdx === -1 || !argv[targetIdx + 1]) {
  fail("usage: sync-version.mjs --target <version> [--check]");
}
const target = argv[targetIdx + 1].trim();
if (!/^\d+\.\d+\.\d+/.test(target)) {
  fail(`--target does not look like a semver: ${target}`);
}

// --- sync -------------------------------------------------------------------
let src;
try {
  src = readFileSync(TARGET_FILE, "utf8");
} catch (err) {
  fail(`cannot read src/index.ts: ${err.message}`);
}

const match = src.match(CONSTANT_RE);
if (!match) {
  // The genuinely-broken case: the constant is absent entirely. This must stay
  // distinguishable from the idempotent no-op case above.
  fail(`PACKAGE_VERSION constant not found in src/index.ts — expected \`const PACKAGE_VERSION = "x.y.z"\``);
}

const current = match[1];

if (current === target) {
  console.log(`ALREADY=${current}`);
  process.exit(0);
}

if (checkOnly) {
  console.log(`WOULD=${current}>${target}`);
  process.exit(0);
}

const updated = src.replace(CONSTANT_RE, `PACKAGE_VERSION = "${target}"`);
if (updated === src) {
  // Defensive: replacement should always have changed something here, since
  // current !== target. Guards against a regex that matched but cannot replace.
  fail(`internal: PACKAGE_VERSION matched "${current}" but replacement was a no-op`);
}
writeFileSync(TARGET_FILE, updated);
console.log(`SET=${target}`);
