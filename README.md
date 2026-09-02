# mcp-drugsea

MCP (Model Context Protocol) stdio server for [DrugSea / Yaohai](https://db.drugsea.cn) pharmaceutical databases.

The server forwards tool calls to **`https://db3.drugsea.cn/api`** with personal user token auth (`Authorization: Bearer ysk_…`). It covers:

- **yaohai-*** — cross-database catalog / search / detail / global / smart-search (`POST /g/mcp/yaohai/*`)
- **product-cn-*** — already-marketed China products (search/detail via MCP on db3; facets via GET)
- **reg-cn-*** — CDE registration / review pipeline (search/detail via MCP on db3; facets via GET)

**GitHub:** [github.com/kinginsun/mcp-drugsea](https://github.com/kinginsun/mcp-drugsea)

## Installation

```bash
npm install -g @kinginsun/mcp-drugsea
```

Or run without installing:

```bash
npx -y @kinginsun/mcp-drugsea
```

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

On db3, direct GET list routes may return encrypted payloads; this client auto-routes `product-cn-search` / `reg-cn-search` / detail through MCP POST when the base URL contains `db3.drugsea.cn`.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `YAOHAI_BASE_URL` | `https://db3.drugsea.cn/api` | API origin (no trailing slash). MCP: `/g/mcp/yaohai/*` |
| `YAOHAI_VERIFY_SSL` | `true` | Set `false` / `0` / `off` to skip TLS certificate verification (needed on some prod hosts) |
| `YAOHAI_USE_MCP_LIST` | auto on db3 | Force product/reg search via MCP POST instead of GET |

### Cursor MCP (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "drugsea": {
      "command": "npx",
      "args": ["-y", "@kinginsun/mcp-drugsea"],
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
      "args": ["-y", "@kinginsun/mcp-drugsea"],
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
| Other DBs (医保 `yibao`, 基药 `jiyao`, 集采 `jicai`, trials, DMF, …) | `yaohai-catalog` → `yaohai-search` → `yaohai-detail` |
| Global panorama | `yaohai-global-search` |
| Unclear which DB | `yaohai-smart-search` |

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
| `yaohai-global-search` | `q?`, `query?`, `limit?`, `offset?` | `q` fills `query.term` |
| `yaohai-smart-search` | `q`, `query?`, `limit?` | Auto-routes up to 3 DBs |

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

## Requirements

- Node.js >= 18.0.0

## License

MIT
