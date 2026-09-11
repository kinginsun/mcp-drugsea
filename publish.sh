#!/usr/bin/env bash
#
# publish.sh — release @kinginsun/mcp-drugsea to the npm registry
# (which is what makes `npx @kinginsun/mcp-drugsea@latest` work for end users).
#
# Pipeline:
#   preflight → npm auth → version bump → sync PACKAGE_VERSION → clean build
#   → secret/tarball audit → stdio smoke test → hermetic update-check suite
#   → optional full + facet suites (need a live token)
#   → npm publish → git commit + tag → git push → post-publish verify
#
# Publish runs BEFORE commit/tag on purpose: npm OTP codes expire in ~30s, and
# committing first would leave a tagged-but-unpublished repo on OTP failure.
#
# Usage:
#   ./publish.sh                 # auto-bump patch (0.2.1 → 0.2.2)
#   ./publish.sh --minor         # 0.2.1 → 0.3.0
#   ./publish.sh --major         # 0.2.1 → 1.0.0
#   ./publish.sh --version 0.3.0 # explicit target version
#   ./publish.sh --dry-run       # everything except publish/commit/push
#   ./publish.sh --yes           # skip interactive confirmation
#   ./publish.sh --skip-tests    # skip ALL suites incl. the hermetic one (stdio tool-count guard still runs)
#   ./publish.sh --note "add yaohai-facets"     # override auto-generated release note
#   ./publish.sh --otp 123456    # npm 2FA one-time code (else prompted)
#   ./publish.sh --expect-no-otp # your token bypasses OTP (npm automation token)
#   ./publish.sh --no-push       # publish, but leave the git push to you
#
# Requires: node >= 18, npm, git, and an npm account logged in with publish
# rights on the @kinginsun scope (`npm login`).

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PKG_ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
EXPECTED_TOOLS=13                 # keep in sync with README "should list N tools"
REMOVED_TOOLS=(yaohai-smart-search)  # regression guard: must never come back
# yaohai-facets is the single generic facet tool (44 dbs, 129 fields, generated
# from the drugsea frontend condition-filter map). Guarded so a refactor cannot
# silently drop it while EXPECTED_TOOLS still adds up.
REQUIRED_TOOLS=(yaohai-facets)
NEEDS_GIT_PUSH=1
DRY_RUN=0
ASSUME_YES=0
SKIP_TESTS=0
BUMP="patch"
TARGET_VERSION=""
RELEASE_NOTE=""
OTP_CODE=""
EXPECT_NO_OTP=0

C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'

log()  { printf '%s\n' "${C_CYAN}==>${C_RESET} $*"; }
ok()   { printf '%s\n' "${C_GREEN}  ok${C_RESET} $*"; }
warn() { printf '%s\n' "${C_YELLOW} warn${C_RESET} $*"; }
step() { printf '\n%s%s%s\n' "${C_BOLD}" "$*" "${C_RESET}"; }
die()  { printf '%s\n' "${C_RED}FAIL${C_RESET} $*" >&2; exit 1; }

cleanup() {
  local code=$?
  [[ $code -ne 0 ]] && printf '\n%s\n' "${C_RED}Release aborted (exit $code). Nothing was published.${C_RESET}" >&2
  return 0
}
trap cleanup EXIT

usage() {
  awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "${BASH_SOURCE[0]}"
  exit 0
}

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --patch)      BUMP="patch"; shift ;;
    --minor)      BUMP="minor"; shift ;;
    --major)      BUMP="major"; shift ;;
    --version)    TARGET_VERSION="${2:-}"; [[ -n "$TARGET_VERSION" ]] || die "--version needs a value"; shift 2 ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --yes|-y)     ASSUME_YES=1; shift ;;
    --skip-tests) SKIP_TESTS=1; shift ;;
    --note)       RELEASE_NOTE="${2:-}"; [[ -n "$RELEASE_NOTE" ]] || die "--note needs a value"; shift 2 ;;
    --otp)        OTP_CODE="${2:-}"; [[ -n "$OTP_CODE" ]] || die "--otp needs a value"; shift 2 ;;
    --expect-no-otp) EXPECT_NO_OTP=1; shift ;;
    --no-push)    NEEDS_GIT_PUSH=0; shift ;;
    -h|--help)    usage ;;
    *)            die "Unknown option: $1 (see --help)" ;;
  esac
done

confirm() {
  [[ $ASSUME_YES -eq 1 ]] && return 0
  if [[ ! -t 0 ]]; then
    # Fail closed, but say why: with no TTY a prompt can never be answered, and
    # "declined by user" would send you looking for a human decision that never
    # happened (e.g. running under CI, or an agent-driven shell).
    die "confirmation required but stdin is not a terminal: \"$1\". Re-run with --yes to accept, or run interactively."
  fi
  printf '%s' "${C_YELLOW}  $1 [y/N] ${C_RESET}"
  local reply=""
  read -r reply || reply=""
  [[ "$reply" =~ ^[Yy]$ ]] || die "declined by user"
}

step "1/9  Preflight"

command -v node >/dev/null || die "node not found"
command -v npm  >/dev/null || die "npm not found"
command -v git  >/dev/null || die "git not found"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 18 ]] || die "node >= 18 required (found $(node -v))"
ok "node $(node -v) / npm $(npm -v)"

[[ -f package.json ]] || die "package.json not found — run from the repo root"
[[ -f src/index.ts ]] || die "src/index.ts not found"
ok "package: ${C_BOLD}$PKG_NAME${C_RESET}"

# ---------------------------------------------------------------------------
step "2/9  Git state"
# ---------------------------------------------------------------------------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not a git repository"

BRANCH="$(git branch --show-current)"
[[ "$BRANCH" == "main" ]] || warn "on branch '$BRANCH', not 'main'"
ok "branch: $BRANCH"

DIRTY_FILES="$(git status --porcelain)"
if [[ -n "$DIRTY_FILES" ]]; then
  warn "uncommitted changes will be included in the release commit:"
  printf '%s\n' "$DIRTY_FILES" | sed 's/^/       /'
  confirm "commit these as part of the release?"
fi

# ---------------------------------------------------------------------------
step "3/9  npm authentication"
# ---------------------------------------------------------------------------
REGISTRY="$(npm config get registry)"
ok "registry: $REGISTRY"

if ! NPM_USER="$(npm whoami 2>/dev/null)"; then
  if [[ $DRY_RUN -eq 1 ]]; then
    warn "not logged in to $REGISTRY — dry-run continues, but real publish needs: npm login"
    NPM_USER="<not logged in>"
  else
    die "not logged in to $REGISTRY — run: npm login"
  fi
fi
ok "logged in as: ${C_BOLD}$NPM_USER${C_RESET}"

# Detect 2FA up front. An OTP-requiring account combined with a non-interactive
# shell and no --otp usually means publish cannot succeed — fail in seconds
# instead of after a 30s build + full test suite.
#
# IMPORTANT: this must stay advisory in one case. npm "automation" granular
# tokens bypass OTP even though `npm profile get` still reports the account as
# auth-and-writes, and there is no reliable way to tell such a token apart from
# a classic one. So a project-level .npmrc (the standard way to wire up an
# automation token) is treated as evidence to proceed rather than to block.
if [[ $DRY_RUN -eq 0 ]]; then
  # NOTE: `npm profile get` is an account-management call, and npm now requires
  # an interactive 2FA challenge for those when the credential is a bypass-2FA
  # granular token. So this probe can legitimately come back empty even though
  # the account has 2FA on — an empty result means "unknown", never "off".
  TFA_MODE="$(npm profile get 2>/dev/null | sed -nE 's/^two-factor auth:[[:space:]]*//p' | head -1 || true)"
  if [[ "$TFA_MODE" == auth-and-writes || "$TFA_MODE" == auth-only ]]; then
    if [[ -n "$OTP_CODE" ]]; then
      ok "npm 2FA enabled ($TFA_MODE) — using the supplied --otp"
    elif [[ -t 0 ]]; then
      ok "npm 2FA enabled ($TFA_MODE) — will prompt for an OTP at publish time"
    elif [[ -f .npmrc ]]; then
      warn "npm 2FA enabled ($TFA_MODE) and stdin is not a terminal, but a project .npmrc was found."
      warn "Assuming it carries an automation token that bypasses OTP; npm publish is the final judge."
      EXPECT_NO_OTP=1
    elif [[ $EXPECT_NO_OTP -eq 1 ]]; then
      warn "npm 2FA enabled ($TFA_MODE) — proceeding on --expect-no-otp (automation token assumed)"
    else
      die "2FA is enabled ($TFA_MODE) but stdin is not a terminal and no --otp was given. Options: (a) run interactively in a terminal, (b) pass --otp 123456, (c) put an npm automation granular token in a project .npmrc (gitignored), or (d) pass --expect-no-otp if you know your token bypasses OTP."
    fi
  elif [[ -z "$TFA_MODE" ]]; then
    warn "could not read the npm 2FA setting (account-management calls now need an interactive 2FA challenge for some token types)."
    warn "Proceeding — npm publish is the final judge on whether an OTP is required."
    EXPECT_NO_OTP=1
  else
    ok "npm 2FA not required for publishing"
  fi
fi

# ---------------------------------------------------------------------------
step "4/9  Version resolution"
# ---------------------------------------------------------------------------
CURRENT_VERSION="$(node -p "require('./package.json').version")"
PUBLISHED_LATEST="$(npm view "$PKG_NAME" version 2>/dev/null || echo "")"
ok "package.json : $CURRENT_VERSION"
ok "registry     : ${PUBLISHED_LATEST:-<never published>}"

# Warn on the drift we know about: src/environment.ts PACKAGE_VERSION vs package.json.
SRC_VERSION="$(node -p "
  const m = require('fs').readFileSync('src/environment.ts','utf8').match(/PACKAGE_VERSION\s*=\s*[\"']([^\"']+)[\"']/);
  m ? m[1] : '';
")"
if [[ -n "$SRC_VERSION" && "$SRC_VERSION" != "$CURRENT_VERSION" ]]; then
  warn "src/environment.ts PACKAGE_VERSION ($SRC_VERSION) != package.json ($CURRENT_VERSION) — will be synced"
fi

if [[ -n "$TARGET_VERSION" ]]; then
  echo "$TARGET_VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$' \
    || die "invalid semver: $TARGET_VERSION"
  NEXT_VERSION="$TARGET_VERSION"
else
  # A previous aborted run may have already bumped package.json above the
  # registry without publishing. Detect that (local > registry AND local not
  # published) and reuse it, so we don't leak a version number every retry.
  LOCAL_AHEAD=0
  if [[ -n "$PUBLISHED_LATEST" ]]; then
    LOCAL_AHEAD="$(node -p "
      const cmp=(x,y)=>{const p=s=>s.split('-')[0].split('.').map(Number);const a=p(x),b=p(y);
        for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0)?1:-1;}return 0;};
      cmp('$CURRENT_VERSION','$PUBLISHED_LATEST') > 0 ? 1 : 0;
    ")"
  else
    LOCAL_AHEAD=1   # never published but a local version exists → reuse it
  fi

  if [[ "$LOCAL_AHEAD" == "1" ]] && ! npm view "$PKG_NAME@$CURRENT_VERSION" version >/dev/null 2>&1; then
    NEXT_VERSION="$CURRENT_VERSION"
    warn "reusing $CURRENT_VERSION (already bumped above registry $PUBLISHED_LATEST but never published — a prior run was aborted). Use --version X.Y.Z to override."
  else
    NEXT_VERSION="$(node -p "
      const [a,b,c] = '$CURRENT_VERSION'.split('-')[0].split('.').map(Number);
      const bumps = { major:[a+1,0,0], minor:[a,b+1,0], patch:[a,b,c+1] };
      bumps['$BUMP'].join('.');
    ")"
  fi
fi

if [[ "$NEXT_VERSION" == "$CURRENT_VERSION" ]]; then
  if npm view "$PKG_NAME@$NEXT_VERSION" version >/dev/null 2>&1; then
    die "version $NEXT_VERSION is already published — pick a higher one (--minor / --version X.Y.Z)"
  fi
  ok "target version $NEXT_VERSION is free on the registry"
fi

if npm view "$PKG_NAME@$NEXT_VERSION" version >/dev/null 2>&1; then
  die "version $NEXT_VERSION already exists on the registry — bump again"
fi

# Guard against publishing over/behind a registry that is ahead of the local
# checkout (e.g. released from another machine). Compare NEXT vs PUBLISHED_LATEST.
if [[ -n "$PUBLISHED_LATEST" ]]; then
  CMP="$(node -p "
    const cmp=(x,y)=>{const p=s=>s.split('-')[0].split('.').map(Number);const a=p(x),b=p(y);
      for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0)?1:-1;}return 0;};
    cmp('$NEXT_VERSION','$PUBLISHED_LATEST');
  ")"
  if [[ "$CMP" -le 0 ]]; then
    die "registry latest ($PUBLISHED_LATEST) is already >= target ($NEXT_VERSION). Your local checkout may be behind — git pull, then bump higher (--version X.Y.Z)"
  fi
fi

ok "release version: ${C_BOLD}$CURRENT_VERSION → $NEXT_VERSION${C_RESET}"

# ---------------------------------------------------------------------------
step "5/9  Apply version + clean build"
# ---------------------------------------------------------------------------
# Sync src/environment.ts's PACKAGE_VERSION with package.json so MCP clients and
# the API User-Agent see the right version. The logic lives in
# scripts/sync-version.mjs, which documents the idempotency contract: a re-run
# after an aborted release finds the constant already correct, and that is a
# no-op SUCCESS — not a failure.
#
# --check runs it read-only, so --dry-run exercises the same code path instead
# of skipping it. An earlier bug hid in this exact spot because dry-run never
# reached the real branch.
if [[ $DRY_RUN -eq 1 ]]; then
  warn "--dry-run: package.json left untouched; checking PACKAGE_VERSION sync read-only"
  SYNC_OUT="$(node scripts/sync-version.mjs --target "$NEXT_VERSION" --check)" \
    || die "could not verify src/environment.ts PACKAGE_VERSION — see error above"
  case "$SYNC_OUT" in
    ALREADY=*) ok "src/environment.ts PACKAGE_VERSION already $NEXT_VERSION (nothing to do)" ;;
    WOULD=*)   ok "would set src/environment.ts PACKAGE_VERSION ${SYNC_OUT#WOULD=}" ;;
    *)         die "unexpected version-sync result: $SYNC_OUT" ;;
  esac
else
  npm version "$NEXT_VERSION" --no-git-tag-version --allow-same-version >/dev/null
  ok "package.json → $NEXT_VERSION"

  SYNC_OUT="$(node scripts/sync-version.mjs --target "$NEXT_VERSION")" \
    || die "could not sync src/environment.ts PACKAGE_VERSION — see error above"
  case "$SYNC_OUT" in
    ALREADY=*) ok "src/environment.ts PACKAGE_VERSION already $NEXT_VERSION" ;;
    SET=*)     ok "src/environment.ts PACKAGE_VERSION → ${SYNC_OUT#SET=}" ;;
    *)         die "unexpected version-sync result: $SYNC_OUT" ;;
  esac

  # The constant must now actually match package.json — verify, don't assume.
  VERIFY="$(node scripts/sync-version.mjs --target "$NEXT_VERSION" --check)"
  [[ "$VERIFY" == "ALREADY=$NEXT_VERSION" ]] \
    || die "version sync mismatch: src/index.ts did not settle on $NEXT_VERSION (got: $VERIFY)"
  ok "versions in lockstep: $NEXT_VERSION"
fi

log "clean build"
rm -rf dist
if [[ -d node_modules ]]; then
  ok "node_modules present — skipping install (avoids touching package-lock.json)"
else
  log "installing dependencies"
  npm install --no-audit --no-fund --loglevel=error
fi
npm run build
[[ -f dist/index.js ]] || die "build produced no dist/index.js"
[[ -x dist/index.js ]] || chmod +x dist/index.js
ok "dist/index.js built ($(du -h dist/index.js | cut -f1))"

# ---------------------------------------------------------------------------
step "6/9  Security + tarball audit"
# ---------------------------------------------------------------------------
log "scanning build output for leaked credentials"
if grep -rEn 'ysk_[0-9a-fA-F]{16,}' src/ dist/ 2>/dev/null; then
  die "hardcoded YAOHAI token found in src/ or dist/ — remove it before publishing"
fi
ok "no hardcoded tokens in src/ or dist/"

log "tarball contents"
PACK_JSON="$(npm pack --dry-run --json 2>/dev/null)"
FILES="$(printf '%s' "$PACK_JSON" | node -e '
  let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
    const j=JSON.parse(d)[0];
    console.log(j.files.map(f=>f.path).join("\n"));
  });')"
printf '%s\n' "$FILES" | sed 's/^/       /'

# The package.json "files" allowlist must never admit secrets or sources.
FORBIDDEN_RE='(^|/)(\.env|\.env\..*|tokens\.local\.env|\.npmrc|\.git/|graphify-out/|\.workbuddy/)'
if printf '%s\n' "$FILES" | grep -Eq "$FORBIDDEN_RE"; then
  die "tarball would include a forbidden path (.env / tokens / internals) — fix package.json \"files\""
fi
printf '%s\n' "$FILES" | grep -Eq '^dist/' || die "tarball is missing dist/ — build output not included"
printf '%s\n' "$FILES" | grep -Eq '^package\.json$' || die "tarball is missing package.json"
# Count from the JSON, not `wc -l`: FILES has no trailing newline, so wc
# under-reports by one.
TARBALL_STATS="$(printf '%s' "$PACK_JSON" | node -p '
  const j = JSON.parse(require("fs").readFileSync(0, "utf8"))[0];
  `${j.files.length} files, ${j.size} bytes packed`;
')"
ok "tarball clean ($TARBALL_STATS)"

# ---------------------------------------------------------------------------
step "7/9  Smoke test (stdio tools/list)"
# ---------------------------------------------------------------------------
SMOKE_TOKEN="${YAOHAI_MCP_TOKEN:-ysk_00000000000000000000000000000000}"
TOOLS_JSON="$(
  printf '%s\n' \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"publish-check","version":"1.0"}}}' \
    '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | YAOHAI_MCP_TOKEN="$SMOKE_TOKEN" YAOHAI_MCP_UPDATE_CHECK=0 node dist/index.js 2>/dev/null \
  | node -e '
      let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
        for (const l of d.split("\n").filter(Boolean).reverse()) {
          try { const m=JSON.parse(l); if (m.result?.tools) { console.log(JSON.stringify(m.result.tools.map(t=>t.name))); process.exit(0); } } catch {}
        }
        console.log("[]");
      });'
)"
TOOL_NAMES="$(printf '%s' "$TOOLS_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).join("\n")))')"
TOOL_COUNT="$(printf '%s' "$TOOLS_JSON" | node -p 'JSON.parse(require("fs").readFileSync(0,"utf8")).length')"

[[ "$TOOL_COUNT" -gt 0 ]] || die "tools/list returned nothing — server failed to start"
[[ "$TOOL_COUNT" == "$EXPECTED_TOOLS" ]] \
  || die "tools/list returned $TOOL_COUNT tools, expected $EXPECTED_TOOLS. If the tool set intentionally changed, update EXPECTED_TOOLS in publish.sh and the counts in README.md"
ok "tools/list: $TOOL_COUNT tools"
printf '%s\n' "$TOOL_NAMES" | sed 's/^/       /'

for removed in "${REMOVED_TOOLS[@]}"; do
  if printf '%s\n' "$TOOL_NAMES" | grep -qx "$removed"; then
    die "$removed is still registered — it was removed on purpose (see REMOVED_TOOLS in publish.sh)"
  fi
  ok "$removed is gone"
done

for required in "${REQUIRED_TOOLS[@]}"; do
  printf '%s\n' "$TOOL_NAMES" | grep -qx "$required" \
    || die "$required is missing from tools/list (see REQUIRED_TOOLS in publish.sh)"
  ok "$required is present"
done

if [[ $SKIP_TESTS -eq 0 ]]; then
  SUITE_OK=1

  # Hermetic suite: stands up a fake registry on localhost, so it needs neither
  # a live DrugSea token nor internet access. Runs unconditionally — a broken
  # update check must fail the release even when the token is dead or missing.
  log "running hermetic update-check suite (fake local registry, no token needed)"
  if node scripts/test-update-check.mjs; then
    ok "update-check suite passed"
  else
    SUITE_OK=0
    warn "update-check suite reported failures"
  fi

  # The full suite needs a *live* token. Check it first so that a dead token is
  # reported as a credential problem, not mistaken for a code regression.
  ENV_TOKEN=""
  if [[ -f .env ]]; then
    ENV_TOKEN="$(sed -nE 's/^YAOHAI_MCP_TOKEN=//p' .env | head -1 | tr -d '\r' | xargs || true)"
    # The probe talks to the real API, so it needs the base URL / TLS settings too.
    for key in YAOHAI_BASE_URL YAOHAI_VERIFY_SSL; do
      val="$(sed -nE "s/^${key}=//p" .env | head -1 | tr -d '\r' | xargs || true)"
      [[ -n "$val" ]] && export "${key?}=${val?}"
    done
  fi
  ENV_TOKEN="${YAOHAI_MCP_TOKEN:-$ENV_TOKEN}"

  if [[ -z "$ENV_TOKEN" ]]; then
    warn "no YAOHAI_MCP_TOKEN available (env or .env) — skipping full suite"
  elif ! echo "$ENV_TOKEN" | grep -Eq '^ysk_[0-9a-f]{32}$'; then
    warn "YAOHAI_MCP_TOKEN is not 'ysk_' + 32 hex — skipping full suite"
  else
    log "checking token against the API (POST /g/mcp/yaohai/catalog)"
    TOKEN_STATUS="$(
      YAOHAI_MCP_TOKEN="$ENV_TOKEN" node --input-type=module -e '
        import { pathToFileURL } from "node:url";
        const api = await import(pathToFileURL("dist/api.js").href);
        try {
          await api.yaohaiPost("/g/mcp/yaohai/catalog", { q: "医保" });
          console.log("OK");
        } catch (e) {
          console.log(String((e && e.message) || e).slice(0, 200));
        }
      ' 2>/dev/null || echo "probe-error"
    )"
    if [[ "$TOKEN_STATUS" == "OK" ]]; then
      ok "token accepted — running full ${EXPECTED_TOOLS}-tool suite"
      # NOTE: do not reset SUITE_OK here — it already carries the hermetic
      # update-check result from above, and clobbering it would let a failure
      # there slip through to publish.
      if node scripts/test-all-tools.mjs; then
        ok "full suite passed"
      else
        SUITE_OK=0
        warn "full suite reported failures"
      fi
      # Dedicated yaohai-facets assertions: discovery mode, bucket fetch, filter
      # narrowing, per-db defaultQuery merge, and each error path. Kept separate
      # from the smoke test because it exercises branches the smoke test cannot
      # reach without a live token.
      if node scripts/test-facets.mjs; then
        ok "facet suite passed"
      else
        SUITE_OK=0
        warn "facet suite reported failures"
      fi
    else
      warn "token REJECTED by the API:"
      printf '%s\n' "$TOKEN_STATUS" | sed 's/^/       /'
      warn "this is a credential problem (expired/revoked token), NOT a code regression."
      warn "the backend's 'X-Yaohai-Api-Key' wording is generic — this client only sends Authorization: Bearer."
      warn "fix: regenerate the token at db.drugsea.cn (personal center → API Token), update .env, re-run."
      confirm "publish anyway without a verified token?"
    fi
  fi

  # Single unified gate, outside the token branch: it must fire even when the
  # token was missing/rejected, because the hermetic update-check suite ran
  # regardless and its result still lives in SUITE_OK.
  if [[ $SUITE_OK -eq 0 ]]; then
    # Log the decision explicitly. confirm() returns silently under --yes, so
    # without this line a CI run would publish over failing tests leaving no
    # trace in the log of why that was allowed.
    warn "one or more test suites FAILED — proceeding would ship a known-broken release"
    confirm "publish anyway despite test failures?"
    warn "proceeding despite test failures (explicitly confirmed)"
  fi
else
  warn "--skip-tests: all suites skipped"
fi

# ---------------------------------------------------------------------------
TAG="v$NEXT_VERSION"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  die "git tag $TAG already exists"
fi

# Build the release note: explicit --note wins, otherwise derive it from the
# commits since the last release tag plus any uncommitted work (which this
# script is about to commit).
if [[ -z "$RELEASE_NOTE" ]]; then
  LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"
  NOTE_PARTS=""
  if [[ -n "$LAST_TAG" ]]; then
    NOTE_PARTS="$(git log --no-merges --pretty=format:'- %s' "$LAST_TAG"..HEAD 2>/dev/null)"
  fi
  if [[ -n "$DIRTY_FILES" ]]; then
    DIRTY_LIST="$(printf '%s\n' "$DIRTY_FILES" | sed -E 's/^.{3}//' | sed -E 's/^"//; s/"$//' | sort -u | tr '\n' ' ' | sed -E 's/ +$//; s/ +/, /g')"
    DIRTY_NOTE="- uncommitted changes: $DIRTY_LIST"
    NOTE_PARTS="${NOTE_PARTS:+$NOTE_PARTS$'\n'}$DIRTY_NOTE"
  fi
  RELEASE_NOTE="${NOTE_PARTS:-- see git log}"
fi
log "release note:"
printf '%s\n' "$RELEASE_NOTE" | sed 's/^/       /'

# -------------------------------------------------------------------------
# ORDERING IS DELIBERATE: publish BEFORE commit/tag.
#
# npm OTP codes expire in ~30s. If we committed and tagged first, an expired or
# mistyped OTP would leave the repo tagged v$NEXT_VERSION but unpublished — and
# every re-run would then die on "git tag already exists", needing manual
# cleanup. Publishing first means an OTP failure is a clean no-op: nothing was
# committed, so just re-run.
# -------------------------------------------------------------------------
step "8/9  Publish to npm"

if [[ $DRY_RUN -eq 1 ]]; then
  warn "--dry-run: skipping npm publish and git commit/tag/push"
else
  log "npm publish --access public"
  PUBLISH_ARGS=(publish --access public)

  # 2FA: prompt last so the code is consumed immediately, right after the
  # (slow) build + test phases have already finished.
  if [[ -z "$OTP_CODE" && -t 0 ]]; then
    printf '%s' "${C_YELLOW}  npm OTP (2FA code, ~30s validity — leave blank if not enabled): ${C_RESET}"
    read -r OTP_CODE || OTP_CODE=""
  fi
  [[ -z "$OTP_CODE" ]] || PUBLISH_ARGS+=(--otp="$OTP_CODE")

  if npm "${PUBLISH_ARGS[@]}"; then
    ok "published $PKG_NAME@$NEXT_VERSION"
  else
    die "npm publish failed — nothing was committed or tagged, so the repo is clean. Fix the cause (usually an expired/invalid OTP) and re-run."
  fi

  # -------------------------------------------------------------------------
  step "9/9  Commit + tag + push"
  # -------------------------------------------------------------------------
  git add -A
  git commit -F - <<EOF >/dev/null
release: $PKG_NAME v$NEXT_VERSION

$RELEASE_NOTE
EOF
  ok "committed"

  git tag -a "$TAG" -m "$PKG_NAME v$NEXT_VERSION"
  ok "tagged $TAG"

  if [[ $NEEDS_GIT_PUSH -eq 1 ]]; then
    log "pushing branch + tag to origin"
    git push origin "$BRANCH"
    git push origin "$TAG"
    ok "pushed $BRANCH and $TAG"
  else
    warn "--no-push: remember to 'git push origin $BRANCH && git push origin $TAG'"
  fi

  # -------------------------------------------------------------------------
  step "Post-publish verification"
  # -------------------------------------------------------------------------
  REG_VERSION="$(npm view "$PKG_NAME" version 2>/dev/null || echo '?')"
  [[ "$REG_VERSION" == "$NEXT_VERSION" ]] \
    || warn "registry shows $REG_VERSION (may lag a few seconds) — re-check with: npm view $PKG_NAME version"
  ok "registry latest: $REG_VERSION"

  log "verifying npx entrypoint"
  if echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     | YAOHAI_MCP_TOKEN="$SMOKE_TOKEN" npx -y "$PKG_NAME@$NEXT_VERSION" 2>/dev/null \
     | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const m=JSON.parse(d.trim().split("\n").pop());console.log("npx tools:",m.result.tools.length)}catch(e){console.log("npx verify inconclusive")}})'; then
    ok "npx $PKG_NAME@$NEXT_VERSION runs"
  else
    warn "npx verification inconclusive (registry propagation can take a minute)"
  fi
fi

trap - EXIT
if [[ $DRY_RUN -eq 1 ]]; then
  printf '\n%s\n' "${C_YELLOW}${C_BOLD}Dry run complete: $PKG_NAME@$NEXT_VERSION would be published (nothing changed).${C_RESET}"
else
  printf '\n%s\n' "${C_GREEN}${C_BOLD}Release complete: $PKG_NAME@$NEXT_VERSION${C_RESET}"
  printf '%s\n' "${C_DIM}Users can now run: npx -y $PKG_NAME${C_RESET}"
fi
