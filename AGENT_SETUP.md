# Agent Setup Guide — install mcp-drugsea + every skill in `skills/`

**Audience: you, the AI agent.** This page is a deterministic playbook. Follow the
steps in order, run every verification gate, and stop at the first failure and
report it to the user. Estimated time: 3–5 minutes.

You are installing **four** things, **all mandatory**: the MCP server plus every
skill shipped under this repo's `skills/` directory.

| What | Why | Where it comes from |
|---|---|---|
| `@kinginsun/mcp-drugsea` MCP server | 13 tools that search the 61 MCP-visible DrugSea / 药海遨游 pharmaceutical databases (approvals, CDE reviews, trials, sales, tenders, 医保/集采, patents, companies, news…). `china_new_drugs` and `generic_cn` are hidden. | npm (`npx -y @kinginsun/mcp-drugsea@latest`) |
| `drugsea` skill | Teaches you *how to use those tools correctly*: database routing, field keys, facet discovery, query value grammar, and ~20 gotchas (silent query drops, version tells, `has_detail: false` DBs) | this repo, `skills/drugsea/` (NOT bundled in the npm package) |
| `echarts` skill | Chart/visualization guidance (ECharts 6.x option configs, dataset best practices, SSR) plus bundled `references/`, `templates/`, and a `scripts/generate_chart.py` helper — presents DrugSea query results (sales, 集采, trial trends…) as charts | this repo, `skills/echarts/` (NOT bundled in the npm package) |
| `drug-project-initiation` skill | 药品立项调研报告：仿制/改良立项、可行性评估、FTO、竞争格局、市场准入。Pulls PubChem identity + 2D structure, collects evidence from the MCP-visible DrugSea DBs, scores P1/P2/P3, draws ECharts figures, and assembles a print-ready A4 HTML report | this repo, `skills/drug-project-initiation/` (NOT bundled in the npm package) |

Install **all four**. The server without the skills leaves you guessing field
names; the skills without the server have nothing to call. `drug-project-initiation`
depends on the other two (DrugSea routing + ECharts figures) — do not install it
alone.

If `skills/` later gains another folder that contains a `SKILL.md`, copy that
folder too. The copy commands below copy **every** skill directory, not a
hard-coded pair.

---

## Prerequisites (verify before anything else)

```bash
node -v   # must be >= 18
npm -v
python3 -V   # needed by skill scripts (PubChem fetch, chart HTML, report audit)
```

If Node < 18, stop and tell the user to upgrade Node first.

If `python3` is missing, still install the MCP server and skills, but tell the
user that `drug-project-initiation` Phase 1 (PubChem) and Phase 3 (page audit)
plus `echarts`' `generate_chart.py` will not run until Python 3 is available.
`fetch_chem_info.py` is stdlib-only (no pip packages). Report-page audit
(`audit_pages.sh`) additionally needs `browser-harness`, `pdftoppm`, and
Python Pillow — those are runtime deps for generating a report, not for this
install.

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
        "YAOHAI_MCP_TOKEN": "ysk_REPLACE_ME",
        "YAOHAI_BASE_URL": "https://db.drugsea.cn/api",
        "YAOHAI_USE_MCP_LIST": "true"
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
claude mcp add drugsea -e YAOHAI_MCP_TOKEN=ysk_REPLACE_ME -e YAOHAI_BASE_URL=https://db.drugsea.cn/api -e YAOHAI_USE_MCP_LIST=true -- npx -y @kinginsun/mcp-drugsea@latest
claude mcp list   # verification gate
```

### Codex CLI — `~/.codex/config.toml`

```toml
[mcp_servers.drugsea]
command = "npx"
args = ["-y", "@kinginsun/mcp-drugsea@latest"]
env = { YAOHAI_MCP_TOKEN = "ysk_REPLACE_ME", YAOHAI_BASE_URL = "https://db.drugsea.cn/api", YAOHAI_USE_MCP_LIST = "true" }
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

## Step 2 — Install every skill in `skills/` (all mandatory)

All skills live in this repo under `skills/<name>/` (each has a `SKILL.md`).
They are **not** published to npm, so you install them by cloning this repo
from GitHub and copying **every** skill folder into a skills directory your host
scans:

| Folder | What it contains |
|---|---|
| `skills/drugsea/` | `SKILL.md` + `reference/` (**10** files) |
| `skills/echarts/` | `SKILL.md` + `references/`, `templates/echarts_html_template.html`, `scripts/generate_chart.py` |
| `skills/drug-project-initiation/` | `SKILL.md` + `reference/` (**4** files: `data-collection.md`, `pubchem.md`, `report-layout.md`, `scoring-framework.md`), `templates/report-template.html`, `scripts/fetch_chem_info.py`, `scripts/audit_pages.sh` |

| Host | Global skills dir | Project skills dir |
|---|---|---|
| Cursor | `~/.cursor/skills/` | `<workspace>/.cursor/skills/` |
| Claude Code | `~/.claude/skills/` | `<workspace>/.claude/skills/` |
| Cross-agent convention | `~/.agents/skills/` | — |

Prefer a project-scoped install when the workspace is dedicated to pharma work;
prefer global so every project can search DrugSea and run 立项调研. Ask the
user if unclear. Use the *same* `<SKILLS_DIR>` for **all** skills.

### Default method — clone from GitHub, then copy every skill folder

```bash
git clone --depth 1 https://github.com/kinginsun/mcp-drugsea.git /tmp/mcp-drugsea
mkdir -p ~/.cursor/skills                 # adapt to your host
cp -R /tmp/mcp-drugsea/skills/* ~/.cursor/skills/
rm -rf /tmp/mcp-drugsea
```

No git? Fetch the tarball instead (equivalent):

```bash
curl -fsSL https://github.com/kinginsun/mcp-drugsea/archive/refs/heads/main.tar.gz \
  | tar -xz -C /tmp mcp-drugsea-main/skills \
  && mkdir -p ~/.cursor/skills \
  && cp -R /tmp/mcp-drugsea-main/skills/* ~/.cursor/skills/ \
  && rm -rf /tmp/mcp-drugsea-main
```

### Fallback — local copy (only if this repo is already checked out AND network access to GitHub is unavailable)

```bash
# From the repo root (the directory containing this AGENT_SETUP.md):
mkdir -p ~/.cursor/skills                 # adapt to your host
cp -R skills/* ~/.cursor/skills/
```

A stale local checkout installs stale skills — prefer the clone so you always get
`main`. If the clone returns an empty or missing `skills/` folder, report it as a
setup failure (that means the repo layout changed), not something to fall back from.

**Verification gate 2** — substitute `<SKILLS_DIR>` with the directory you copied
into (e.g. `~/.cursor/skills`). All **eleven** checks must pass:

```bash
test -f <SKILLS_DIR>/drugsea/SKILL.md && echo "drugsea SKILL.md present"
ls <SKILLS_DIR>/drugsea/reference | wc -l   # expect 10
test -f <SKILLS_DIR>/echarts/SKILL.md && echo "echarts SKILL.md present"
test -f <SKILLS_DIR>/echarts/references/echarts_option_cheatsheet.md && echo "cheatsheet present"
test -f <SKILLS_DIR>/echarts/templates/echarts_html_template.html && echo "template present"
test -f <SKILLS_DIR>/echarts/scripts/generate_chart.py && echo "echarts script present"
test -f <SKILLS_DIR>/drug-project-initiation/SKILL.md && echo "drug-project-initiation SKILL.md present"
ls <SKILLS_DIR>/drug-project-initiation/reference | wc -l   # expect 4
test -f <SKILLS_DIR>/drug-project-initiation/templates/report-template.html && echo "report template present"
test -f <SKILLS_DIR>/drug-project-initiation/scripts/fetch_chem_info.py && echo "pubchem script present"
test -f <SKILLS_DIR>/drug-project-initiation/scripts/audit_pages.sh && echo "audit script present"
```

Then confirm your host actually picked all three up: they should appear in your
available-skills list (Cursor/Claude may need a window reload). Their trigger
descriptions start with:

- `drugsea` — *"One-stop search across DrugSea databases…"* / *"药海/Yaohai：国内上市…"*
- `echarts` — *"Guide for creating data visualizations and charts using Apache ECharts…"*
- `drug-project-initiation` — *"药品立项调研报告：仿制/改良立项、可行性评估、FTO…"*

Note: the `echarts` skill is self-contained — it does **not** require the
`echarts` npm package; its template and `generate_chart.py` load ECharts from
the jsDelivr CDN, so a generated `chart.html` opens directly in a browser with
no build step.

Note: `drug-project-initiation` is **not** self-contained. Before writing a
立项报告, read `drugsea/SKILL.md` (routing) and `echarts/SKILL.md` (figures).
PubChem identity uses `scripts/fetch_chem_info.py` (stdlib `urllib` only);
do not hand-draw or AI-generate 2D structures.

---

## Step 3 — Verify end to end (two real calls)

Through the MCP client (not the shell), make two tool calls:

1. `yaohai-catalog` with `{"q": "医保"}` → should list databases including
   `yibao` / `jiyao`, `isError: false`.
2. `product-cn-search` with `{"query": {"drug_name": "阿司匹林"}, "limit": 3}` →
   should return rows with `total > 0` and a `field_labels` map.

Both succeeding means: server runs, token authenticates, permissions work.

Then exercise the `drugsea` skill: answer a question like *"阿托伐他汀在医保目录里吗"* by
following the skill's workflow (route → `yibao` → facets for exact values →
search → summarize per `result-presentation.md`). If you find yourself calling
`yaohai-smart-search` or inventing facet values like `register_type=化药3类`,
the skill is not loaded — re-check Step 2.

Do **not** generate a full 立项报告 during setup. Confirm the
`drug-project-initiation` skill is listed; use it later when the user asks for
立项调研 / 品种可行性 / 能不能仿.

---

## Step 4 — Report to the user

Summarize what you installed:

- MCP server `drugsea` (v0.5.0+, 13 tools) registered in `<config path>` — token stored in client `env`.
- Skill `drugsea` installed at `<skills path>/drugsea` — read `SKILL.md` before any DrugSea search.
- Skill `echarts` installed at `<skills path>/echarts` — read its `SKILL.md` before generating charts.
- Skill `drug-project-initiation` installed at `<skills path>/drug-project-initiation` — read its `SKILL.md` before 立项调研 / 可行性报告.
- Verification results (gate 1: 13 tools; gate 2: all eleven checks — drugsea SKILL.md + 10 reference files, echarts SKILL.md + cheatsheet + template + script, drug-project-initiation SKILL.md + 4 reference files + report template + pubchem script + audit script; step 3: both calls OK).
- Reminders: `@latest` only applies on a **new** MCP process. After an npm publish, reload the connector; if the version is still stale, clear `~/.npm/_npx` (npm 10 has no `npm cache npx ls`) and reload again. Skill updates require re-running Step 2 (fresh `git clone` and
  re-copy of `skills/*`) since they are not on npm.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Server log: `Set YAOHAI_MCP_TOKEN to your personal DrugSea token…` | Token missing from client `env` — redo Step 1 with the real token |
| `YAOHAI_MCP_TOKEN must be a personal user token` | Not `ysk_` + 32 hex — have the user regenerate it (个人中心 → API Token) |
| `401` / `Unauthorized` (even worded `invalid or missing X-Yaohai-Api-Key`) | Token expired/revoked — regenerate. The backend uses that header name in the error for *any* rejected credential; this client only sends `Authorization: Bearer`. If rotating, also `unset YAOHAI_MCP_TOKEN` in your shell so a stale export doesn't shadow the new value |
| Forbidden on one specific database | Token inherits account permissions — check the subscription on db.drugsea.cn, not the MCP client |
| `yaohai-facets` missing / `yaohai-smart-search` present | Stale npx cache serving an old version — confirm `args` contains `@latest`, then clear the npx cache (**npm 11:** `npm cache npx ls` / `npm cache npx rm <key>`; **npm 10:** `rm -rf ~/.npm/_npx`) and **reload** the MCP server. A running process keeps the old tool list until it is restarted. |
| `mcp-drugsea: command not found` under npx | You ran the smoke test inside this repo's source dir — run it elsewhere, or `npm install && npm run build` then `node dist/index.js` |
| Empty/encrypted payload from product/reg GET routes | Keep default `YAOHAI_USE_MCP_LIST=true` (MCP POST). Set `YAOHAI_BASE_URL=https://db.drugsea.cn/api` |
| Search tools fail with `HTTP 504` / `HTML, not JSON` / `Unexpected token '<'` | `db3.drugsea.cn` gateway times out around 50s. Use `YAOHAI_BASE_URL=https://db.drugsea.cn/api`. If already on db, retry; do not `--yes` a publish over a hang |
| TLS errors on some hosts | Set `YAOHAI_VERIFY_SSL=false` in the server `env` |
| Skill never triggers | Host didn't index the skills dir — reload the window; confirm the path is the one your host scans (`~/.cursor/skills/`, `~/.claude/skills/`, or the project-level equivalent) and that `SKILL.md` has its YAML frontmatter intact |
| `drug-project-initiation` missing after copy | You copied only `drugsea` and `echarts` from an older playbook — re-run Step 2 with `cp -R …/skills/*` so every folder lands in `<SKILLS_DIR>` |
| Search returns `total` equal to the whole database | You used an unknown field key — queries silently drop unknown keys. Load the skill and check field keys via `product-cn-fields` / `reg-cn-fields` / the `reference/db-*.md` files |
| PubChem script fails / no 2D structure | Need `python3` on PATH; query with English INN (Chinese names usually miss). See `skills/drug-project-initiation/reference/pubchem.md` |
| `audit_pages.sh` not found / `browser-harness: command not found` | Page-audit is a report-generation runtime dep, not required to finish this install. Install `browser-harness`, `pdftoppm`, and Pillow when you actually produce a 立项 HTML report |

Full server-side details: [README.md](README.md) → *Quick start for AI Agents*.
Full tool-usage doctrine: `skills/drugsea/SKILL.md` after installation.
立项调研 workflow: `skills/drug-project-initiation/SKILL.md` after installation.
