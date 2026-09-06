# mcp-drugsea

MCP (Model Context Protocol) stdio server for [DrugSea / Yaohai](https://db.drugsea.cn) pharmaceutical databases.

The server forwards tool calls to **`https://db3.drugsea.cn/api`** with personal user token auth (`Authorization: Bearer ysk_…`). It covers:

- **yaohai-*** — cross-database catalog / search / detail / facets / global (`POST /g/mcp/yaohai/*`; facets via GET)
- **product-cn-*** — already-marketed China products (search/detail via MCP on db3; facets via GET)
- **reg-cn-*** — CDE registration / review pipeline (search/detail via MCP on db3; facets via GET)

**GitHub:** [github.com/kinginsun/mcp-drugsea](https://github.com/kinginsun/mcp-drugsea)

## Installation

```bash
npm install -g @kinginsun/mcp-drugsea
```

Or run without installing (`@latest` makes npx re-resolve the newest published version each launch instead of pinning to its cache):

```bash
npx -y @kinginsun/mcp-drugsea@latest
```

## Updating

How updates reach you depends on how you installed the server.

### 1. `npx` with `@latest` — automatic (recommended)

The MCP configs in this README use:

```json
"args": ["-y", "@kinginsun/mcp-drugsea@latest"]
```

`@latest` makes npx resolve the newest published version from the registry on every launch (registry metadata is cached locally for up to ~5 minutes), so you pick up new releases just by reloading the MCP server. No action needed.

If your config uses the **bare package name** (`"-y", "@kinginsun/mcp-drugsea"`), npx keys its cache by the exact package argument and may keep serving a stale version. Add `@latest` and reload.

### 2. Global install — manual

`npm install -g` pins the version you installed; nothing updates it automatically.

```bash
npm update -g @kinginsun/mcp-drugsea
npm ls -g @kinginsun/mcp-drugsea      # confirm the new version
```

### 3. Stuck on an old version? Clear the npx cache

`npm cache clean --force` does **not** touch the npx cache — that is the usual reason an update appears not to take effect. npm 11 has dedicated subcommands:

```bash
npm cache npx ls                       # list cached npx entries
npm cache npx rm <key>                 # remove the stale entry for this package
```

Older npm versions: remove the cache directory manually (`rm -rf ~/.npm/_npx`; on Windows `%LOCALAPPDATA%\npm-cache\_npx`).

### In-server update notice

Every launch performs a **non-blocking** version check against the registry and, when a newer version is published, reports it on two channels:

- **stderr** — shown in your MCP client's server log panel;
- **an MCP `notifications/message` log notification** (`level: warning`).

The notice includes the exact commands above. It never blocks startup, never writes to stdout (which carries JSON-RPC), and fails silently when the registry is unreachable — results are cached for 24h so repeated launches do not re-query.

Disable it with `YAOHAI_MCP_UPDATE_CHECK=0`. Behind a proxy or using an npm mirror, set `YAOHAI_NPM_REGISTRY` to your registry origin.

### Pinning a version

Prefer stability over freshness? Pin an exact version or a range instead of `@latest`:

```json
"args": ["-y", "@kinginsun/mcp-drugsea@0.4.0"]
```

A range such as `@^0.4.0` auto-updates within `0.4.x` only, which avoids picking up breaking changes from a future minor release.

## Configuration

### `YAOHAI_MCP_TOKEN` (required)

Authentication uses **personal user tokens only** (`ysk_` + 32 hex chars). The legacy shared `X-Yaohai-Api-Key` header is **not supported**.

| Credential | Format | HTTP header |
|------------|--------|-------------|
| Personal user token | `ysk_` + 32 hex chars | `Authorization: Bearer ysk_…` |

Obtain a token from DrugSea / Yaohai (user account settings), then:

```bash
export YAOHAI_MCP_TOKEN=ysk_your_token_here
```

#### How to get a token from DrugSea (Yaohai)

1. Open [https://db.drugsea.cn](https://db.drugsea.cn) in a browser.
2. Log in with **WeChat QR scan** (微信扫码登录).
3. Enter the **personal center** (个人中心).
4. In the left sidebar, click **API Token**.
5. Click **generate token** (生成 Token) and copy the result — it looks like `ysk_` + 32 hex characters.

Notes:

- Each account can generate up to **10 tokens**.
- A token inherits the **same database permissions as its Yaohai account** — if your account cannot see a database, the token cannot either. If a tool call returns a permission error, check your account's subscription/permissions on db.drugsea.cn, not the MCP client.
- Store the token in your MCP client's `env` (see below) or export it as `YAOHAI_MCP_TOKEN`. Never commit it to a repository.

On db3, direct GET list routes may return encrypted payloads; this client auto-routes `product-cn-search` / `reg-cn-search` / detail through MCP POST when the base URL contains `db3.drugsea.cn`.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `YAOHAI_BASE_URL` | `https://db3.drugsea.cn/api` | API origin (no trailing slash). MCP: `/g/mcp/yaohai/*` |
| `YAOHAI_VERIFY_SSL` | `true` | Set `false` / `0` / `off` to skip TLS certificate verification (needed on some prod hosts) |
| `YAOHAI_USE_MCP_LIST` | auto on db3 | Force product/reg search via MCP POST instead of GET |
| `YAOHAI_MCP_UPDATE_CHECK` | enabled | Set `0` / `false` / `off` to disable the startup version check (see [Updating](#updating)) |
| `YAOHAI_NPM_REGISTRY` | `https://registry.npmjs.org` | Registry used by the version check. Point at a mirror if npmjs.org is unreachable from your network |

### Cursor MCP (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "drugsea": {
      "command": "npx",
      "args": ["-y", "@kinginsun/mcp-drugsea@latest"],
      "env": {
        "YAOHAI_MCP_TOKEN": "ysk_your_token_here"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "drugsea": {
      "command": "npx",
      "args": ["-y", "@kinginsun/mcp-drugsea@latest"],
      "env": {
        "YAOHAI_MCP_TOKEN": "ysk_your_token_here"
      }
    }
  }
}
```

## Which tools to use

| User intent | Tools |
|-------------|--------|
| Already listed in China (国药准字, 批准文号, 上市, 医保/集采状态) | `product-cn-fields` → `product-cn-search` / `product-cn-facets` → `product-cn-detail` |
| R&D / CDE (在研, 受理号, 审评, 尚未上市) | `reg-cn-fields` → `reg-cn-search` / `reg-cn-facets` → `reg-cn-detail` |
| Other DBs (医保 `yibao`, 基药 `jiyao`, 集采 `jicai`, trials, DMF, …) | `yaohai-catalog` → `yaohai-search` / `yaohai-facets` → `yaohai-detail` |
| Global panorama | `yaohai-global-search` |
| Unclear which DB | `yaohai-catalog` (list DBs by keyword/category) → `yaohai-search`, or `yaohai-global-search` |

Therapeutic-class queries (抗癌, 心血管, …): prefer ConditionSearch `ATC_code` (letter, e.g. `L` oncology, `C` cardiovascular, `J` anti-infectives, `N` nervous system). Confirm values with a facets tool when unsure.

If `total > 20`, summarize in chat (about 5–10 sample rows) instead of pasting the full table.

xlsx export is not implemented in this MCP (v1 returns JSON samples only).

`product-cn-*` and `reg-cn-*` list/facet/detail calls use the same routes as the website where applicable. Some deployments IP-allowlist direct GET paths. The `yaohai-*` tools use `POST /g/mcp/yaohai/*` with Bearer token auth.

## Tools

### Yaohai (cross-DB)

| Tool | Parameters | Notes |
|------|------------|--------|
| `yaohai-catalog` | `category?`, `q?` | List databases |
| `yaohai-search` | `dbname`, `query?`, `limit?`, `offset?` | Default limit 10, max 50 |
| `yaohai-detail` | `dbname`, `id` | Skip DBs with `has_detail: false` |
| `yaohai-facets` | `dbname?`, `query?`, `fields?` | Facets for `dbs`-route DBs. Omit `fields` → discover facet-capable DBs/fields; pass `fields` → fetch buckets |
| `yaohai-global-search` | `q?`, `query?`, `limit?`, `offset?` | `q` fills `query.term` |

When the target database is unclear, use `yaohai-catalog` (filter by `category` / `q`) to pick a `dbname`, then `yaohai-search`; or use `yaohai-global-search` for a cross-database panorama query.

`yaohai-facets` mirrors the ConditionSearch facet filters of the website for the `dbs`-route databases (医保 `yibao`, 基药 `jiyao`, 集采 `jicai`, sales `drugsales`, …). Two modes:

- **Discovery** (no `fields`): omit `dbname` to list all 44 facet-capable databases, or pass `dbname` to list its facet-able fields (with `filter_type`).
- **Fetch** (`dbname` + `fields`): returns aggregation buckets (`value`/`count`) for the named terms fields, optionally narrowed by `query`. Only `terms`-type fields are exposed (44 DBs, 129 fields); date/range/tree filters are not faceted here.

For the two dedicated ES routes use `product-cn-facets` / `reg-cn-facets` instead — `yaohai-facets` returns an actionable hint if you pass `product_cn` / `reg_cn`.

### product_cn (marketed)

| Tool | Parameters | Notes |
|------|------------|--------|
| `product-cn-fields` | _(none)_ | Local field catalog |
| `product-cn-search` | `query?`, `limit?`, `offset?`, `view_type?` | Default `search_mode=3`; limit default 20, max 100 |
| `product-cn-facets` | `query?`, `facets` (required) | Do not request all 22 dimensions. Recommended: `ATC_code`, `drug_type`, `national_yibao`, `std_dosage_form`, `source` |
| `product-cn-detail` | `id` | Encrypted id from search rows |

`first_approve_date` is first listing date; `approve_date` is latest re-registration (not first listing).

`view_type`: `eslist` (default) / `list_by_drug_name` / `list_by_manufacture`.

### reg_cn (CDE review)

| Tool | Parameters | Notes |
|------|------------|--------|
| `reg-cn-fields` | _(none)_ | Local field catalog |
| `reg-cn-search` | `query?`, `limit?`, `offset?`, `view_type?` | Default `rows_excluded=1`, `search_mode=1`; limit default 20, max 100 |
| `reg-cn-facets` | `query?`, `facets` (required) | Recommended: `ATC_code`, `rd_status`, `drug_type`, `transact_status`, `register_type` |
| `reg-cn-detail` | `id` | Encrypted id from search rows |

`view_type`: `eslist` (default) / `list_by_drug_name` / `list_by_enterprise`.

`query` values may be string, number, or string arrays (ConditionSearch `multiple`). Dates: `"YYYY-MM-DD to YYYY-MM-DD"`. Ranges: `"min to max"`.

## Quick start for AI Agents (install, configure, test)

> **Agents: prefer [`AGENT_SETUP.md`](AGENT_SETUP.md).** It is the full install playbook and additionally covers installing the companion `drugsea` skill (`skills/drugsea/`), which teaches correct tool routing, field keys, facets, and query gotchas across all 63 databases. The section below installs the server only.

This section is a step-by-step playbook an AI agent (or a human) can follow to install, configure, and verify this MCP server end to end.

### Prerequisites

- Node.js >= 18 (`node -v`)
- npm (`npm -v`)
- A DrugSea / Yaohai personal token (`ysk_` + 32 hex chars) — see [How to get a token from DrugSea (Yaohai)](#how-to-get-a-token-from-drugsea-yaohai)

### Step 0 — Register the server with your MCP client

Add the server to your client config so it auto-starts. Example for Cursor (`~/.cursor/mcp.json`) — see [Configuration](#configuration) for other clients:

```json
{
  "mcpServers": {
    "drugsea": {
      "command": "npx",
      "args": ["-y", "@kinginsun/mcp-drugsea@latest"],
      "env": {
        "YAOHAI_MCP_TOKEN": "ysk_your_token_here"
      }
    }
  }
}
```

Then reload MCP servers in the client (Cursor: Settings → MCP → refresh). The client should list **13 tools**.

### Step 1 — Install (optional, for local/CLI use)

Either run via npx on demand (no install needed), or install globally / from source:

```bash
# Option A: run without installing (what the MCP configs above do)
npx -y @kinginsun/mcp-drugsea@latest

# Option B: global install
npm install -g @kinginsun/mcp-drugsea
npm ls -g @kinginsun/mcp-drugsea

# Option C: from source (when developing)
git clone https://github.com/kinginsun/mcp-drugsea.git
cd mcp-drugsea
npm install
npm run build
```

### Step 2 — Configure the token

```bash
export YAOHAI_MCP_TOKEN=ysk_your_token_here
```

For MCP client usage, put the token in the client config `env` instead (Step 0). Sanity-check the format:

```bash
node -e "console.log(/^ysk_[0-9a-f]{32}$/i.test(process.env.YAOHAI_MCP_TOKEN) ? 'token format OK' : 'token format BAD')"
```

### Step 3 — Smoke test over stdio (JSON-RPC)

The server speaks MCP over stdio. The recommended handshake sequence is `initialize` → `notifications/initialized` → request. Run this **outside** the package source directory (or use `node dist/index.js` inside it):

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | YAOHAI_MCP_TOKEN=$YAOHAI_MCP_TOKEN npx -y @kinginsun/mcp-drugsea@latest \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{for(const l of d.split('\n')){if(!l.trim())continue;let m;try{m=JSON.parse(l)}catch{continue}if(m.id===2)console.log('tools:',m.result.tools.length)}})"
```

Expected: `tools: 13`.

The filter selects the response with `"id":2` rather than piping through `tail -1`, because the server may also emit a `notifications/message` (version-update notice) on stdout. Both are valid JSON-RPC, but only one is the answer you asked for.

One-liner variant without the handshake (also works with this server):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here npx -y @kinginsun/mcp-drugsea@latest
```

### Step 4 — Test real tool calls

```bash
# Catalog lookup (no external DB data needed)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"yaohai-catalog","arguments":{"q":"医保"}}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here npx -y @kinginsun/mcp-drugsea@latest

# China marketed products search
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"product-cn-search","arguments":{"query":{"drug_name":"阿司匹林"},"limit":3}}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here npx -y @kinginsun/mcp-drugsea@latest

# Global panorama search
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"yaohai-global-search","arguments":{"q":"阿司匹林","limit":3}}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here npx -y @kinginsun/mcp-drugsea@latest
```

Expected: each response has `"isError":false` and non-empty `content`.

### Step 5 — Full 13-tool suite (from source)

```bash
git clone https://github.com/kinginsun/mcp-drugsea.git
cd mcp-drugsea
npm install && npm run build
YAOHAI_MCP_TOKEN=ysk_your_token_here node scripts/test-all-tools.mjs
```

Expected final line: `--- Summary: 14 passed, 0 failed / 14 tool calls ---`.

### Step 6 — Verify inside the MCP client

After reloading MCP servers in the client, ask the agent:

1. "List the drugsea tools" → should see 13 tools.
2. "Search 阿司匹林 in product-cn" → should return rows with `total > 0`.
3. "Global search: PD-1" → should return panorama results without error.

### Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Set YAOHAI_MCP_TOKEN to your personal DrugSea token…` | Token env var missing/empty — set it (Step 2 / client `env`) |
| `YAOHAI_MCP_TOKEN must be a personal user token` | Token not `ysk_` + 32 hex — regenerate in personal center → API Token |
| `401` / `Unauthorized` (incl. backend's `invalid or missing X-Yaohai-Api-Key`) | Token expired or revoked — regenerate at db.drugsea.cn (personal center → API Token). The backend returns that `X-Yaohai-Api-Key` wording for **any** rejected credential; this client only ever sends `Authorization: Bearer`, so ignore the header name and replace the token. If you rotated the token, also `unset YAOHAI_MCP_TOKEN` — a stale exported value shadows the updated `.env`. |
| Permission/forbidden on a specific DB | Token inherits account permissions — check the account's subscription on db.drugsea.cn |
| `mcp-drugsea: command not found` when running npx | You are inside the package source dir — run from another directory or use `node dist/index.js` |
| Empty/encrypted payload from product/reg GET | Use default db3 base URL (auto MCP POST routing) or set `YAOHAI_USE_MCP_LIST=true` |
| TLS errors on some hosts | Set `YAOHAI_VERIFY_SSL=false` |
| Client keeps running an old version | npx cache is keyed by the exact package arg — use `@latest` in `args`, or clear it with `npm cache npx ls` / `npm cache npx rm <key>`. See [Updating](#updating). |
| Global install never updates | `npm install -g` pins the version — run `npm update -g @kinginsun/mcp-drugsea` |
| No update notice appears | Expected when you are already current, when the registry is unreachable (check fails silently), or when `YAOHAI_MCP_UPDATE_CHECK=0`. Clients also need the server's `logging` capability, so check the MCP server log panel for the stderr line as well. |

## Manual stdio test

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here node dist/index.js
```

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"yaohai-catalog","arguments":{"q":"医保"}}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here node dist/index.js
```

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"product-cn-search","arguments":{"query":{"drug_name":"阿司匹林"},"limit":3}}}' \
  | YAOHAI_MCP_TOKEN=ysk_your_token_here node dist/index.js
```

## Releasing (maintainers)

`publish.sh` releases the package to npm (which is what makes `npx -y @kinginsun/mcp-drugsea@latest` work). It syncs `src/index.ts`'s `PACKAGE_VERSION` with `package.json`, builds clean, audits the tarball for leaked tokens, runs the 13-tool suite plus the facet and update-check suites, commits + tags, then publishes and pushes.

```bash
npm login                # once, with rights on the @kinginsun scope
./publish.sh --dry-run   # full rehearsal, no side effects
./publish.sh --minor     # real release (0.2.1 → 0.3.0)
./publish.sh --help      # all flags (--major, --version, --otp, --skip-tests, --note, --no-push)
```

The suite needs a **live** token: `publish.sh` probes the API first and, on rejection, reports it as a credential problem rather than a code regression. If you rotated `YAOHAI_MCP_TOKEN`, run `unset YAOHAI_MCP_TOKEN` first so the new `.env` value isn't shadowed by a stale exported one.

## Requirements

- Node.js >= 18.0.0

## License

MIT
