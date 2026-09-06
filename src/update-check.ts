/**
 * Non-blocking npm update check.
 *
 * Why this exists: MCP clients usually launch the server with
 * `npx -y @kinginsun/mcp-drugsea`. A bare package name resolves against the
 * local npx cache and can pin users to a stale version indefinitely, and
 * `npm install -g` users never auto-update at all. Since we cannot retroactively
 * patch code that is already installed on a user's machine, every release ships
 * this check so subsequent versions can tell the user how to upgrade.
 *
 * Hard constraints (do not weaken):
 *  - MUST NOT write to stdout: this is a stdio JSON-RPC server, stdout is the
 *    protocol channel. Diagnostics go to stderr / notifications only.
 *  - MUST NOT throw or reject: a version check can never break server startup.
 *  - MUST NOT block startup: the caller fires this off without awaiting connect.
 *  - MUST be cheap: one small request per process, TTL-cached across processes.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PACKAGE_NAME = "@kinginsun/mcp-drugsea";

/** Registry doc for a single version; ~2 KB, far cheaper than the full packument. */
function registryLatestUrl(): string {
  const base = (process.env.YAOHAI_NPM_REGISTRY || "https://registry.npmjs.org")
    .trim()
    .replace(/\/+$/, "");
  // Scoped names must be percent-encoded in the path.
  return `${base}/${PACKAGE_NAME.replace("/", "%2F")}/latest`;
}

/** How long a cached "latest version" answer stays fresh. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Fail fast: a slow registry must never be felt by the user. */
const FETCH_TIMEOUT_MS = 1500;

export type UpdateCheckResult = {
  /** Version this build reports (serverInfo.version). */
  current: string;
  /** Newest published version, or undefined if we could not determine it. */
  latest?: string;
  updateAvailable: boolean;
  /** Why we stopped, for debugging. Never shown to users verbatim. */
  status: "up-to-date" | "update-available" | "disabled" | "error";
  detail?: string;
};

/** Truthiness for env flags: "0", "", "false", "no", "off" all mean disabled. */
function flagDisabled(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const value = raw.trim().toLowerCase();
  return ["0", "", "false", "no", "off"].includes(value);
}

export function updateCheckEnabled(): boolean {
  return !flagDisabled(process.env.YAOHAI_MCP_UPDATE_CHECK);
}

/**
 * Minimal semver precedence compare, avoiding a runtime dependency.
 * Returns >0 if a is newer than b, <0 if older, 0 if equal.
 * Handles `MAJOR.MINOR.PATCH` with an optional `-prerelease`; a prerelease of
 * the same numeric triple sorts below the release (per semver §11).
 */
export function compareVersions(a: string, b: string): number {
  const parse = (input: string) => {
    const [core, ...rest] = input.trim().replace(/^v/i, "").split("-");
    const parts = core.split(".").map((n) => {
      const parsed = Number.parseInt(n, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });
    while (parts.length < 3) parts.push(0);
    return { parts: parts.slice(0, 3), prerelease: rest.join("-") };
  };

  const left = parse(a);
  const right = parse(b);

  for (let i = 0; i < 3; i++) {
    if (left.parts[i] !== right.parts[i]) return left.parts[i] - right.parts[i];
  }
  // Numeric triples tie: presence of a prerelease decides.
  if (left.prerelease && !right.prerelease) return -1;
  if (!left.prerelease && right.prerelease) return 1;
  if (left.prerelease && right.prerelease) {
    return left.prerelease < right.prerelease
      ? -1
      : left.prerelease > right.prerelease
        ? 1
        : 0;
  }
  return 0;
}

function cacheFile(): string | undefined {
  try {
    const base =
      process.env.XDG_CACHE_HOME?.trim() ||
      (os.homedir() ? path.join(os.homedir(), ".cache") : os.tmpdir());
    return path.join(base, "mcp-drugsea", "update-check.json");
  } catch {
    return undefined;
  }
}

type CacheShape = { latest: string; checkedAt: number };

function readCache(): CacheShape | undefined {
  const file = cacheFile();
  if (!file) return undefined;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<CacheShape>;
    if (
      typeof parsed.latest === "string" &&
      parsed.latest.length > 0 &&
      typeof parsed.checkedAt === "number"
    ) {
      return { latest: parsed.latest, checkedAt: parsed.checkedAt };
    }
  } catch {
    // Missing, unreadable, or corrupt cache is always fine.
  }
  return undefined;
}

function writeCache(latest: string): void {
  const file = cacheFile();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `${JSON.stringify({ latest, checkedAt: Date.now() })}\n`,
      "utf8"
    );
  } catch {
    // Read-only home, sandboxed FS, full disk: skip caching silently.
  }
}

async function fetchLatest(): Promise<string | undefined> {
  // Node >= 18 guarantees global fetch (see package.json engines).
  if (typeof fetch !== "function") return undefined;
  try {
    const response = await fetch(registryLatestUrl(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { version?: unknown };
    return typeof body.version === "string" && body.version.length > 0
      ? body.version
      : undefined;
  } catch {
    // Offline, DNS failure, dead proxy, TLS interception, timeout: all expected.
    return undefined;
  }
}

/**
 * Resolve the newest published version, preferring the network and falling back
 * to a still-fresh cache entry so offline users get a useful answer too.
 */
/**
 * Resolve the newest published version.
 *
 * Cache-first: a fresh cache entry means zero network traffic and zero added
 * startup latency for every launch inside the TTL window. Only when the cache is
 * missing/expired do we consult the registry, and a failed lookup degrades to the
 * stale cache entry so offline users still get a useful answer.
 */
async function resolveLatest(): Promise<{
  latest?: string;
  detail?: string;
}> {
  const cached = readCache();
  if (cached && Date.now() - cached.checkedAt <= CACHE_TTL_MS) {
    return { latest: cached.latest, detail: "fresh cache; registry not contacted" };
  }

  const live = await fetchLatest();
  if (live) {
    writeCache(live);
    return { latest: live };
  }

  if (cached) {
    return {
      latest: cached.latest,
      detail: "registry unreachable; used stale cached version",
    };
  }
  return { detail: "registry unreachable and no cache" };
}

/**
 * Check for a newer published version. Resolves with a result object and never
 * rejects; callers may safely ignore the promise.
 */
export async function checkForUpdate(
  currentVersion: string
): Promise<UpdateCheckResult> {
  try {
    if (!updateCheckEnabled()) {
      return { current: currentVersion, updateAvailable: false, status: "disabled" };
    }
    if (!/^\d+\.\d+\.\d+/.test(currentVersion.trim())) {
      // Dev builds like "0.0.0-dev" or a git hash: nothing sane to compare.
      return {
        current: currentVersion,
        updateAvailable: false,
        status: "error",
        detail: "non-semver build version",
      };
    }

    const resolved = await resolveLatest();
    if (!resolved.latest) {
      return {
        current: currentVersion,
        updateAvailable: false,
        status: "error",
        detail: resolved.detail,
      };
    }

    const updateAvailable =
      compareVersions(resolved.latest, currentVersion) > 0;
    return {
      current: currentVersion,
      latest: resolved.latest,
      updateAvailable,
      status: updateAvailable ? "update-available" : "up-to-date",
      detail: resolved.detail,
    };
  } catch (error) {
    // Belt and braces: this function is contractually non-throwing.
    return {
      current: currentVersion,
      updateAvailable: false,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Human-readable upgrade instructions, matching the README "Updating" section.
 * Used for both the stderr line and the MCP logging notification.
 */
export function formatUpdateMessage(result: UpdateCheckResult): string {
  if (!result.updateAvailable || !result.latest) return "";
  const lines = [
    `${PACKAGE_NAME} ${result.current} is installed; ${result.latest} is available.`,
    "To update:",
    '  npx users  - change args to ["-y", "@kinginsun/mcp-drugsea@latest"], then reload the MCP server',
    "  global     - npm update -g " + PACKAGE_NAME,
    "  stale npx  - npm cache npx ls && npm cache npx rm <key>",
    "Set YAOHAI_MCP_UPDATE_CHECK=0 to silence this message.",
  ];
  return lines.join("\n");
}
