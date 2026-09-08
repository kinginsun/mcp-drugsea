# Agent Setup Guide — install mcp-drugsea + the `drugsea` skill

**Audience: you, the AI agent.** This page is a deterministic playbook. Follow the
steps in order, run every verification gate, and stop at the first failure and
report it to the user. Estimated time: 3–5 minutes.

You are installing two required things, plus one optional skill:

| What | Why | Where it comes from |
|---|---|---|
| `@kinginsun/mcp-drugsea` MCP server | 13 tools that search all 63 DrugSea / 药海遨游 pharmaceutical databases (approvals, CDE reviews, trials, sales, tenders, 医保/集采, patents, companies, news…) | npm (`npx -y @kinginsun/mcp-drugsea@latest`) |
| `drugsea` skill | Teaches you *how to use those tools correctly*: database routing, field keys, facet discovery, query value grammar, and ~20 gotchas (silent query drops, version tells, `has_detail: false` DBs) | this repo, `skills/drugsea/` (NOT bundled in the npm package) |
| `echarts` skill *(optional)* | Chart/visualization guidance (ECharts 6.x option configs, dataset best practices, SSR) plus bundled `references/`, `templates/`, and a `scripts/generate_chart.py` helper — useful when presenting DrugSea query results as charts | this repo, `skills/echarts/` (NOT bundled in the npm package) |

Install **both** required items. The server without the skill leaves you guessing field names;
the skill without the server has nothing to call. Install the `echarts` skill too if you want
publishable charts (e.g. sales/集采 trends) — see Step 2b.

---

## Prerequisites (verify before anything else)

```bash
node -v   # must be >= 18
npm -v
```

If Node < 18, stop and tell the user to upgrade Node first.

The user must supply a **DrugSea personal token** (`ysk_` + 32 hex chars).
If they don't have one, give them these instructions and wait:

> 1. Open https://db.drugsea.cn and log in with WeChat QR scan (微信扫码登录).
> 2. Go to the personal center (个人中心) → **API Token** in the left sidebar.
> 3. Click 生成 Token and copy it — it looks like `ysk_` followed by 32 hex chars.
>
> Each account allows up to 10 tokens. A token inherits the account's database
> permissions — if a tool call is forbidden on some DB, that is a subscription
> issue on db.drugsea.cn, not an MCP bug.

Sanity-check the format once you receive it:

```bash
node -e "console.log(/^ysk_[0-9a-f]{32}$/i.test(process.argv[1]) ? 'token format OK' : 'token format BAD')" ysk_REPLACE_ME
```

Never write the token into any file inside a git repository other than the MCP
client config below (which the user owns), and never echo it back in chat output.

---

## Step 1 — Register the MCP server with your client

Pick the block matching the host you run in and merge it into the client's MCP
config. Always use `@latest` in `args` so npx re-resolves the newest version on
every launch (a bare package name pins npx's cache and serves stale builds).

### Cursor — `~/.cursor/mcp.json` (global) or `<workspace>/.cursor/mcp.json` (project)

```json
{
  "mcpServers": {
    "drugsea": {
      "command": "npx",
      "args": ["-y", "@kinginsun/mcp-drugsea@latest"],
      "env": {
        "YAOHAI_MCP_TOKEN": "ysk_REPLACE_ME"
      }
    }
  }
}
```

If the file already has other servers, add the `"drugsea"` entry alongside them —
do not overwrite the file. Then reload MCP servers (Cursor: Settings → MCP →
refresh, or toggle the server off/on).

### Claude Desktop — `claude_desktop_config.json`

Same JSON shape as Cursor. File location:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop afterwards.

### Claude Code (CLI)

```bash
claude mcp add drugsea -e YAOHAI_MCP_TOKEN=ysk_REPLACE_ME -- npx -y @kinginsun/mcp-drugsea@latest
claude mcp list   # verification gate
```

### Codex CLI — `~/.codex/config.toml`

```toml
[mcp_servers.drugsea]
command = "npx"
args = ["-y", "@kinginsun/mcp-drugsea@latest"]
env = { YAOHAI_MCP_TOKEN = "ysk_REPLACE_ME" }
```

### Generic / other MCP clients

Use the plain stdio declaration from [`mcpServers.json`](mcpServers.json) in this
repo, substituting the token. Any client that speaks MCP stdio works.

**Verification gate 1** — after reload, the client must list **13 tools**:
`yaohai-catalog`, `yaohai-search`, `yaohai-detail`, `yaohai-facets`,
`yaohai-global-search`, `product-cn-fields`, `product-cn-search`,
`product-cn-facets`, `product-cn-detail`, `reg-cn-fields`, `reg-cn-search`,
`reg-cn-facets`, `reg-cn-detail`.

- If you also see `yaohai-smart-search`, the client is running **≤ v0.2.1** from a
  stale npx cache — see Troubleshooting. Do not use that tool; it is deprecated.
- If `yaohai-facets` is missing, you are on **< v0.4.0** — same fix. The skill
  documents exactly what degrades without it.

### Optional smoke test from the shell (no client needed)

Run **outside** this repo's source directory:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | YAOHAI_MCP_TOKEN=ysk_REPLACE_ME npx -y @kinginsun/mcp-drugsea@latest \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{for(const l of d.split('\n')){if(!l.trim())continue;try{const m=JSON.parse(l);if(m.id===2)console.log('tools:',m.result.tools.length)}catch{}}})"
```

Expected output: `tools: 13`.

---

## Step 2 — Install the `drugsea` skill

The skill lives in this repo at `skills/drugsea/` (one `SKILL.md` plus a
`reference/` folder with **10** files). It is **not** published to npm, so you
install it by copying the folder into a skills directory your host scans:

| Host | Global skills dir | Project skills dir |
|---|---|---|
| Cursor | `~/.cursor/skills/` | `<workspace>/.cursor/skills/` |
| Claude Code | `~/.claude/skills/` | `<workspace>/.claude/skills/` |
| Cross-agent convention | `~/.agents/skills/` | — |

Prefer a project-scoped install when the workspace is dedicated to pharma work;
prefer global so every project can search DrugSea. Ask the user if unclear.

> **Maintainer note (do this once):** `skills/drugsea/` is tracked in git, but
> `skills/echarts/` is currently **untracked**, so the *remote* install paths
> below only work for it after the folder is committed and pushed. Until then,
> use the **local copy** path. To publish it:
> `git add skills/echarts && git commit -m "docs: add echarts agent skill" && git push`.

### Option A — local copy (works right now, from this checked-out repo)

```bash
# From the repo root (the directory containing this AGENT_SETUP.md):
mkdir -p ~/.cursor/skills                 # adapt to your host
cp -R skills/drugsea ~/.cursor/skills/
```

### Option B — remote clone (canonical, once `skills/` is on GitHub)

```bash
git clone --depth 1 https://github.com/kinginsun/mcp-drugsea.git /tmp/mcp-drugsea
mkdir -p ~/.cursor/skills                 # adapt to your host
cp -R /tmp/mcp-drugsea/skills/drugsea ~/.cursor/skills/
rm -rf /tmp/mcp-drugsea
```

No git? Fetch the tarball instead:

```bash
curl -fsSL https://github.com/kinginsun/mcp-drugsea/archive/refs/heads/main.tar.gz \
  | tar -xz -C /tmp mcp-drugsea-main/skills \
  && mkdir -p ~/.cursor/skills \
  && cp -R /tmp/mcp-drugsea-main/skills/drugsea ~/.cursor/skills/
```

If Option B/C returns an empty or missing `skills/` folder, the skill has not been
pushed yet — fall back to Option A from a local checkout.

**Verification gate 2** — substitute `<SKILLS_DIR>` with the directory you copied
into (e.g. `~/.cursor/skills`):

```bash
test -f <SKILLS_DIR>/drugsea/SKILL.md && echo "SKILL.md present"
ls <SKILLS_DIR>/drugsea/reference | wc -l   # expect 10
```

Then confirm your host actually picked it up: the skill should appear in your
available-skills list (Cursor/Claude may need a window reload). Its trigger
description starts with *"One-stop search across all 63 DrugSea / 药海遨游…"*.

---

## Step 2b — Install the `echarts` skill (optional)

The `echarts` skill lives in this repo at `skills/echarts/` (one `SKILL.md` plus
`references/`, `templates/`, and a `scripts/generate_chart.py` helper). Like the
`drugsea` skill it is **not** published to npm — install it by copying the folder
into the *same* skills directory you chose in Step 2 (`<SKILLS_DIR>`, e.g.
`~/.cursor/skills`). Install it when you want to turn DrugSea query results
(sales, 集采, trial trends…) into interactive charts.

### Option A — local copy (works right now, from this checked-out repo)

```bash
# From the repo root (the directory containing this AGENT_SETUP.md):
cp -R skills/echarts <SKILLS_DIR>/
```

### Option B — remote clone (once `skills/echarts/` is on GitHub)

```bash
git clone --depth 1 https://github.com/kinginsun/mcp-drugsea.git /tmp/mcp-drugsea
cp -R /tmp/mcp-drugsea/skills/echarts <SKILLS_DIR>/
rm -rf /tmp/mcp-drugsea
```

If Option B returns an empty or missing `skills/echarts/` folder, it has not been
pushed yet — fall back to Option A from a local checkout.

**Verification gate 2b** — substitute `<SKILLS_DIR>` with the same directory as in Step 2:

```bash
test -f <SKILLS_DIR>/echarts/SKILL.md && echo "SKILL.md present"
test -f <SKILLS_DIR>/echarts/references/echarts_option_cheatsheet.md && echo "cheatsheet present"
test -f <SKILLS_DIR>/echarts/templates/echarts_html_template.html && echo "template present"
test -f <SKILLS_DIR>/echarts/scripts/generate_chart.py && echo "script present"
```

All four lines must echo. The skill (like `drugsea`) is self-contained — it does
**not** require the `echarts` npm package; the template and `generate_chart.py`
load ECharts from the jsDelivr CDN, so a generated `chart.html` opens directly in
a browser with no build step. Reload the window so the host indexes the new skill.

---

## Step 3 — Verify end to end (two real calls)

Through the MCP client (not the shell), make two tool calls:

1. `yaohai-catalog` with `{"q": "医保"}` → should list databases including
   `yibao` / `jiyao`, `isError: false`.
2. `product-cn-search` with `{"query": {"drug_name": "阿司匹林"}, "limit": 3}` →
   should return rows with `total > 0` and a `field_labels` map.

Both succeeding means: server runs, token authenticates, permissions work.

Then exercise the skill: answer a question like *"阿托伐他汀在医保目录里吗"* by
following the skill's workflow (route → `yibao` → facets for exact values →
search → summarize per `result-presentation.md`). If you find yourself calling
`yaohai-smart-search` or inventing facet values like `register_type=化药3类`,
the skill is not loaded — re-check Step 2.

---

## Step 4 — Report to the user

Summarize what you installed:

- MCP server `drugsea` (v0.5.0+, 13 tools) registered in `<config path>` — token stored in client `env`.
- Skill `drugsea` installed at `<skills path>` — read `SKILL.md` before any DrugSea search.
- *(Optional)* Skill `echarts` installed at `<skills path>/echarts` — read its `SKILL.md` before generating charts.
- Verification results (gate 1: 13 tools; gate 2: SKILL.md + 10 reference files; gate 2b if installed: 4 echarts files; step 3: both calls OK).
- Reminders: updates are automatic via `@latest` + server reload; the in-server
  version notice appears on stderr / as a log notification when npm has a newer
  release. Skill updates require re-running Step 2 (`git pull` the repo and
  re-copy) since it is not on npm.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Server log: `Set YAOHAI_MCP_TOKEN to your personal DrugSea token…` | Token missing from client `env` — redo Step 1 with the real token |
| `YAOHAI_MCP_TOKEN must be a personal user token` | Not `ysk_` + 32 hex — have the user regenerate it (个人中心 → API Token) |
| `401` / `Unauthorized` (even worded `invalid or missing X-Yaohai-Api-Key`) | Token expired/revoked — regenerate. The backend uses that header name in the error for *any* rejected credential; this client only sends `Authorization: Bearer`. If rotating, also `unset YAOHAI_MCP_TOKEN` in your shell so a stale export doesn't shadow the new value |
| Forbidden on one specific database | Token inherits account permissions — check the subscription on db.drugsea.cn, not the MCP client |
| `yaohai-facets` missing / `yaohai-smart-search` present | Stale npx cache serving an old version — confirm `args` contains `@latest`, then `npm cache npx ls` / `npm cache npx rm <key>` (or `rm -rf ~/.npm/_npx`) and reload the server |
| `mcp-drugsea: command not found` under npx | You ran the smoke test inside this repo's source dir — run it elsewhere, or `npm install && npm run build` then `node dist/index.js` |
| Empty/encrypted payload from product/reg GET routes | Use the default `https://db3.drugsea.cn/api` base URL (auto-routes through MCP POST), or set `YAOHAI_USE_MCP_LIST=true` |
| TLS errors on some hosts | Set `YAOHAI_VERIFY_SSL=false` in the server `env` |
| Skill never triggers | Host didn't index the skills dir — reload the window; confirm the path is the one your host scans (`~/.cursor/skills/`, `~/.claude/skills/`, or the project-level equivalent) and that `SKILL.md` has its YAML frontmatter intact |
| Search returns `total` equal to the whole database | You used an unknown field key — queries silently drop unknown keys. Load the skill and check field keys via `product-cn-fields` / `reg-cn-fields` / the `reference/db-*.md` files |

Full server-side details: [README.md](README.md) → *Quick start for AI Agents*.
Full tool-usage doctrine: `skills/drugsea/SKILL.md` after installation.
