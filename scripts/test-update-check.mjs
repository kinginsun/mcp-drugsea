/**
 * Hermetic test of the npm update check (src/update-check.ts + index.ts wiring).
 *
 * The check talks to a registry URL, so we stand up a fake registry on localhost
 * and point the server at it via YAOHAI_NPM_REGISTRY. That exercises the real
 * production code path (fetch, semver compare, cache write, stderr line, MCP
 * notification) without waiting for an actual release, and without touching the
 * user's real cache dir (XDG_CACHE_HOME is redirected to a temp folder).
 *
 * Critical invariant under test: stdout is the JSON-RPC channel for a stdio MCP
 * server. Every single byte on stdout must be a parseable JSON-RPC message. The
 * other harnesses skip unparseable lines silently, so they would NOT catch
 * pollution — this one asserts strictly.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ENTRY = join(PROJECT_ROOT, "dist/index.js");

/**
 * Version fixtures are DERIVED, never hardcoded.
 *
 * publish.sh bumps package.json and syncs src/index.ts's PACKAGE_VERSION *before*
 * running the test suites. A hardcoded expected version therefore goes stale the
 * moment the release version moves (this suite failed on the 0.4.0 -> 0.5.0 bump
 * for exactly that reason). package.json is the source of truth that publish.sh
 * itself syncs from, so reading it keeps the assertions correct at any version.
 */
const CURRENT_VERSION = (() => {
  const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf8"));
  if (typeof pkg.version !== "string" || !pkg.version) {
    throw new Error("could not read version from package.json");
  }
  return pkg.version;
})();

/** Bump the major component so the result is newer than any real release. */
function newerThan(version) {
  const core = version.replace(/^v/i, "").split("-")[0].split(".");
  const major = Number.parseInt(core[0], 10) || 0;
  return `${major + 90}.0.0`;
}

/** A version that is unambiguously older than any real release. */
const OLDER_VERSION = "0.0.1";

const NEWER_VERSION = newerThan(CURRENT_VERSION);

let failures = 0;
function check(label, cond, detail) {
  const mark = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Local stand-in for registry.npmjs.org serving /<pkg>/latest. */
function startFakeRegistry(version, { fail = false, delayMs = 0 } = {}) {
  let hits = 0;
  const server = createServer((req, res) => {
    hits++;
    const finish = () => {
      if (fail) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "simulated registry outage" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "@kinginsun/mcp-drugsea", version }));
    };
    if (delayMs > 0) setTimeout(finish, delayMs);
    else finish();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
        hits: () => hits,
      });
    });
  });
}

/**
 * Spawn the MCP server, complete the initialize handshake, then collect
 * notifications/stderr for a while. Returns everything for assertion.
 */
async function runSession({ registryUrl, version, extraEnv = {}, fail, delayMs, collectMs = 2500, cacheDir: sharedCacheDir }) {
  const registry = await startFakeRegistry(version, { fail, delayMs });
  // A caller-supplied cache dir is owned by the caller, so we must not delete it.
  const cacheDir = sharedCacheDir ?? mkdtempSync(join(tmpdir(), "mcp-drugsea-cache-"));
  const ownsCacheDir = !sharedCacheDir;

  const env = {
    ...process.env,
    YAOHAI_MCP_TOKEN: process.env.YAOHAI_MCP_TOKEN || "ysk_" + "0".repeat(32),
    YAOHAI_NPM_REGISTRY: registryUrl ?? registry.url,
    XDG_CACHE_HOME: cacheDir,
    // Force the check ON by default. If a developer has YAOHAI_MCP_UPDATE_CHECK=0
    // exported (e.g. copied from mcp-config.yaml), inheriting it would make
    // sections A-D pass vacuously and hide real regressions. extraEnv is spread
    // last, so section E's opt-out case still overrides this deliberately.
    YAOHAI_MCP_UPDATE_CHECK: "1",
    ...extraEnv,
  };

  const child = spawn("node", [SERVER_ENTRY], { env, stdio: ["pipe", "pipe", "pipe"] });

  const rawStdoutLines = [];
  const badStdoutLines = [];
  const notifications = [];
  const stderrChunks = [];
  let buffer = "";

  const pending = new Map();
  let nextId = 1;

  // Single stdout handler: parse each line, and simultaneously (a) record raw
  // lines, (b) flag any unparseable line as protocol pollution, (c) collect
  // server-initiated notifications, (d) resolve pending request promises by id.
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      rawStdoutLines.push(line);
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        // Strict: unlike the other harnesses, record this as protocol pollution.
        badStdoutLines.push(line);
        continue;
      }
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      } else if (msg.method && msg.id === undefined) {
        notifications.push(msg);
      }
    }
  });
  child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString()));

  const send = (method, params) => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout waiting for ${method} (id ${id})`));
        }
      }, 15000);
    });
  };

  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { logging: {} },
    clientInfo: { name: "update-check-e2e", version: "1.0.0" },
  });

  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n"
  );

  // Give the fire-and-forget check time to land.
  await new Promise((r) => setTimeout(r, collectMs));

  // Prove the server still works normally alongside the check.
  const tools = await send("tools/list", {});

  await new Promise((r) => setTimeout(r, 200));

  const exitEarly = child.exitCode;
  child.stdin.end();
  child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 150));
  if (child.exitCode === null) child.kill("SIGKILL");

  await registry.close();
  if (ownsCacheDir) rmSync(cacheDir, { recursive: true, force: true });

  return {
    init,
    tools,
    notifications,
    stderr: stderrChunks.join(""),
    rawStdoutLines,
    badStdoutLines,
    registryHits: registry.hits(),
    exitEarly,
    cacheDir,
  };
}

function logMessages(session) {
  return session.notifications.filter((n) => n.method === "notifications/message");
}

async function main() {
  console.log(
    `fixtures: current=${CURRENT_VERSION} newer=${NEWER_VERSION} older=${OLDER_VERSION}`
  );

  // Preflight: this suite compares package.json against what the BUILT server
  // reports. A stale dist/ would make every version assertion fail with a
  // confusing message, so surface the real cause first.
  {
    let builtVersion = "unreadable";
    try {
      const source = readFileSync(
        join(PROJECT_ROOT, "dist/index.js"),
        "utf8"
      );
      const m = source.match(/PACKAGE_VERSION\s*=\s*["']([^"']+)["']/);
      builtVersion = m ? m[1] : "not found in dist/index.js";
    } catch {
      builtVersion = "dist/index.js missing";
    }
    if (builtVersion !== CURRENT_VERSION) {
      console.error(
        `\nERROR: dist/ is stale — package.json says ${CURRENT_VERSION} but the build reports ${builtVersion}.\n` +
          `       Run: npm run build\n` +
          `       (publish.sh builds before testing, so this only bites manual runs.)`
      );
      process.exit(1);
    }
    console.log(`preflight: dist/ matches package.json (${builtVersion})\n`);
  }

  console.log("=== A. newer version published -> user is told (both channels) ===");
  {
    const s = await runSession({ version: NEWER_VERSION });
    check("initialize succeeded", !!s.init?.result?.serverInfo, JSON.stringify(s.init?.result?.serverInfo));
    check("serverInfo.version reported", s.init?.result?.serverInfo?.version === CURRENT_VERSION, `${s.init?.result?.serverInfo?.version} vs expected ${CURRENT_VERSION}`);
    check("logging capability declared", !!s.init?.result?.capabilities?.logging);
    check("server not crashed by the check", s.exitEarly === null, `exitCode=${s.exitEarly}`);

    const msgs = logMessages(s);
    check("notifications/message emitted", msgs.length === 1, `${msgs.length} received`);
    const data = typeof msgs[0]?.params?.data === "string" ? msgs[0].params.data : "";
    check("notification level is warning", msgs[0]?.params?.level === "warning", msgs[0]?.params?.level);
    check("notification names both versions", data.includes(NEWER_VERSION) && data.includes(CURRENT_VERSION), `newer=${NEWER_VERSION} current=${CURRENT_VERSION}`);
    check("notification gives npx @latest fix", data.includes("@kinginsun/mcp-drugsea@latest"));
    check("notification gives global fix", data.includes("npm update -g"));
    check("notification gives cache-clear fix", data.includes("npm cache npx"));
    check("notification mentions opt-out env var", data.includes("YAOHAI_MCP_UPDATE_CHECK=0"));

    check("stderr also carries the notice", s.stderr.includes(NEWER_VERSION), s.stderr.slice(0, 120).replace(/\n/g, " | "));
    check("registry hit exactly once", s.registryHits === 1, `${s.registryHits} hits`);
    check("tools/list still works", (s.tools?.result?.tools ?? []).length === 13, `${(s.tools?.result?.tools ?? []).length} tools`);
  }

  console.log("\n=== B. PROTOCOL INTEGRITY: stdout must stay pure JSON-RPC ===");
  {
    const s = await runSession({ version: NEWER_VERSION });
    check("no unparseable lines on stdout", s.badStdoutLines.length === 0, s.badStdoutLines.join(" || ").slice(0, 200));
    check("stdout lines all JSON-RPC", s.rawStdoutLines.length > 0 && s.badStdoutLines.length === 0, `${s.rawStdoutLines.length} lines`);

    // The update text legitimately appears on stdout, but ONLY inside a valid
    // notifications/message. A raw console.log() to stdout would corrupt the
    // JSON-RPC stream, so assert every line carrying it is that notification.
    const linesWithUpdateText = s.rawStdoutLines.filter((l) => l.includes(NEWER_VERSION));
    check("update text present on stdout as a notification", linesWithUpdateText.length === 1, `${linesWithUpdateText.length} lines`);
    const allAreLogNotifications = linesWithUpdateText.every((l) => {
      try {
        const m = JSON.parse(l);
        return m.method === "notifications/message" && m.id === undefined;
      } catch {
        return false;
      }
    });
    check("update text never appears as a non-JSON-RPC stdout line", allAreLogNotifications);
    check("stderr notice is separate from stdout", s.stderr.includes(NEWER_VERSION));
  }

  console.log("\n=== C. already up to date -> silent ===");
  {
    const s = await runSession({ version: CURRENT_VERSION });
    check("no notification when current", logMessages(s).length === 0, `${logMessages(s).length} received (registry claimed ${CURRENT_VERSION})`);
    check("no stderr notice when current", !s.stderr.includes("is available"));
    check("tools/list works", (s.tools?.result?.tools ?? []).length === 13);
  }

  console.log("\n=== D. older published version -> no bogus downgrade nag ===");
  {
    const s = await runSession({ version: OLDER_VERSION });
    check("no notification for older latest", logMessages(s).length === 0, `${logMessages(s).length} received`);
  }

  console.log("\n=== E. opt-out env var honoured ===");
  {
    const s = await runSession({ version: NEWER_VERSION, extraEnv: { YAOHAI_MCP_UPDATE_CHECK: "0" } });
    check("disabled -> no notification", logMessages(s).length === 0);
    check("disabled -> registry never contacted", s.registryHits === 0, `${s.registryHits} hits`);
    check("disabled -> server still serves tools", (s.tools?.result?.tools ?? []).length === 13);
  }

  console.log("\n=== F. registry down -> silent, server unaffected ===");
  {
    const s = await runSession({ version: NEWER_VERSION, fail: true });
    check("outage -> no notification", logMessages(s).length === 0);
    check("outage -> server still serves tools", (s.tools?.result?.tools ?? []).length === 13);
    check("outage -> stdout clean", s.badStdoutLines.length === 0);
  }

  console.log("\n=== G. unreachable registry (connection refused) -> silent ===");
  {
    // Port 1 on localhost: nothing listening, immediate ECONNREFUSED.
    const s = await runSession({ registryUrl: "http://127.0.0.1:1", version: NEWER_VERSION });
    check("refused -> no notification", logMessages(s).length === 0);
    check("refused -> server still serves tools", (s.tools?.result?.tools ?? []).length === 13);
    check("refused -> stdout clean", s.badStdoutLines.length === 0);
    check("refused -> no crash", s.exitEarly === null, `exitCode=${s.exitEarly}`);
  }

  console.log("\n=== H. slow registry -> startup not blocked ===");
  {
    const started = Date.now();
    const s = await runSession({ version: NEWER_VERSION, delayMs: 1200, collectMs: 400 });
    const initLatency = Date.now() - started;
    check("initialize answered despite slow registry", !!s.init?.result?.serverInfo);
    check("tools/list answered", (s.tools?.result?.tools ?? []).length === 13);
    check("notification not sent before handshake", s.badStdoutLines.length === 0);
    console.log(`      (session incl. 400ms collect + tools/list took ${initLatency}ms)`);
  }

  console.log("\n=== I. notification never precedes initialize ===");
  {
    const s = await runSession({ version: NEWER_VERSION });
    const firstNotificationIndex = s.rawStdoutLines.findIndex((l) => {
      try {
        const m = JSON.parse(l);
        return m.method === "notifications/message";
      } catch {
        return false;
      }
    });
    const initResponseIndex = s.rawStdoutLines.findIndex((l) => {
      try {
        return JSON.parse(l).id === 1;
      } catch {
        return false;
      }
    });
    check("initialize response precedes notification", initResponseIndex >= 0 && firstNotificationIndex > initResponseIndex, `init@${initResponseIndex} notify@${firstNotificationIndex}`);
  }

  console.log("\n=== J. TTL cache: repeated launches do not re-hit the registry ===");
  {
    // Share one cache dir across two sessions to simulate a user relaunching
    // their MCP client. Launch 1 populates the cache; launch 2 must serve from
    // it without any network traffic, while still showing the notice.
    const shared = mkdtempSync(join(tmpdir(), "mcp-drugsea-shared-"));
    try {
      const first = await runSession({ version: NEWER_VERSION, cacheDir: shared, collectMs: 1200 });
      check("launch 1 contacts registry once", first.registryHits === 1, `${first.registryHits} hits`);
      check("launch 1 notifies", logMessages(first).length === 1);

      const second = await runSession({ version: NEWER_VERSION, cacheDir: shared, collectMs: 1200 });
      check("launch 2 served from cache (no registry hit)", second.registryHits === 0, `${second.registryHits} hits`);
      check("launch 2 still notifies from cache", logMessages(second).length === 1, `${logMessages(second).length} received`);
      check(`launch 2 cache-derived notice names ${NEWER_VERSION}`, second.stderr.includes(NEWER_VERSION));
    } finally {
      rmSync(shared, { recursive: true, force: true });
    }
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("test harness error:", error);
  process.exit(1);
});
