---
name: drugsea
description: One-stop search across all 63 DrugSea / 药海遨游 (Yaohai) pharmaceutical databases via the user-drugsea MCP tools. Use when the user asks about drug approvals, registrations, CDE reviews, clinical trials, sales, tenders, centralized procurement, insurance/essential-drug lists, patents, companies, package inserts, or regulatory news — in Chinese or English. Covers marketed vs pipeline routing, field meanings, accepted value types, facet filtering, ATC therapeutic classes, and detail drill-down.
---

# DrugSea / 药海遨游 one-stop search

DrugSea exposes 63 pharmaceutical databases. All of them are reachable through the
`user-drugsea` MCP namespace. This skill is documentation only — it tells you which
database to hit, which field keys to use, and what value shape each field accepts.
There are no scripts to run.

## Golden rule: you are the router

**Do not use `yaohai-smart-search`.** That tool's auto-router is deprecated for this
workflow. Instead, you (the LLM) do the routing yourself:

1. Read the user's question and decide **which database(s)** answer it.
2. Look up that database's **field keys** in the matching `reference/db-*.md` file.
3. **Prepare the keywords yourself** — normalize names, translate, expand synonyms,
   pick the right field key and value type.
4. Call the specific search tool (`product-cn-search`, `reg-cn-search`,
   `yaohai-global-search`, or `yaohai-search`).

If you are unsure which database to use, call `yaohai-catalog` (optionally with
`category` or `q`) rather than falling back to smart search.

## Tool map

| MCP tool | Use for | Key args |
|---|---|---|
| `yaohai-catalog` | Discover a `dbname`; confirm category / keywords | `category?`, `q?` |
| `yaohai-global-search` | Cross-database drug panorama (`global_search`) | `q`, `query?`, `limit` (≤50) |
| `product-cn-search` | **Marketed** China drugs (批准文号 / 国药准字) | `query`, `limit` (≤100), `offset`, `view_type?` |
| `product-cn-fields` | Field keys for `product_cn` | — |
| `product-cn-facets` | Facet distributions for `product_cn` | `query?`, **`facets` (required)** |
| `product-cn-detail` | One `product_cn` record | `id` (encrypted, from search items) |
| `reg-cn-search` | **Pipeline** / CDE registration & review | `query`, `limit` (≤100), `offset`, `view_type?` |
| `reg-cn-fields` | Field keys for `reg_cn` | — |
| `reg-cn-facets` | Facet distributions for `reg_cn` | `query?`, **`facets` (required)** |
| `reg-cn-detail` | One `reg_cn` record | `id` (encrypted) |
| `yaohai-search` | Any of the other 60 databases | **`dbname`**, `query`, `limit` (≤50), `offset` |
| `yaohai-facets` | Facet distributions for **44** `dbs`-route databases | `dbname`, `fields?`, `query?` |
| `yaohai-detail` | One record from any database | `dbname`, `id` |
| ~~`yaohai-smart-search`~~ | **Do not use** — route yourself | — |

### Check the server version before using `yaohai-facets`

`yaohai-facets` was added in **mcp-drugsea v0.4.0**. An older connected session does not
have it, and a running MCP server keeps its old tool list until it is reloaded.

**The only signal that matters is whether `yaohai-facets` is listed.** Check for it
directly. Do not infer the version from anything else — the tool list changed twice, and
getting it wrong sends you to a call that cannot succeed:

| Version | `yaohai-facets` | `yaohai-smart-search` | Facets for the 44 `dbs`-route databases |
|---|---|---|---|
| ≤ 0.2.1 | absent | **present** | unavailable |
| 0.3.0 | absent | absent | unavailable |
| ≥ 0.4.0 | **present** | absent | available |

Note `yaohai-smart-search` was removed back in **v0.3.0**, so its presence means the session
is *older* than 0.3.0 — it is a tell for "quite stale", not a marker of 0.3.0 itself. Either
way, absence of `yaohai-facets` is what blocks you.

When `yaohai-facets` is missing: tell the user the MCP server needs a reload to pick up
v0.4.0, and fall back to `product-cn-facets` / `reg-cn-facets`, which exist in all three
versions and cover `product_cn` / `reg_cn`. Do not guess filter values to work around it,
and do not report a facet breakdown you could not actually fetch — say which dimension was
unavailable (see
[result-presentation.md](reference/result-presentation.md#supported-false-is-not-an-error)).

As of 2026-09-06 the session connected to this workspace still listed
`yaohai-smart-search`, i.e. **≤ v0.2.1** — so `yaohai-facets` was not callable through it.
Every `yaohai-facets` result quoted in this skill was captured by spawning the local v0.4.0
build directly.

## Facets: three tools, two behaviours

Facets answer "what values does this field take, and how many rows each?" — the right
way to discover a filter value instead of guessing it.

| Tool | Covers | Fields |
|---|---|---|
| `product-cn-facets` | `product_cn` only | 22 (17 multiple, 2 date, 3 range) |
| `reg-cn-facets` | `reg_cn` only | 22 (17 multiple, 2 date, 3 range) |
| `yaohai-facets` | **44** `dbs`-route databases | 129, **`terms` only** |

`yaohai-facets` is dual-mode, and the mode depends only on whether `fields` is present:

```jsonc
// DISCOVERY — no `fields`. Lists all 44 facet-capable databases and their fields.
{}
// DISCOVERY — one database's facetable fields, with filter_type and the URL prefix.
{"dbname": "yibao"}
// FETCH — `dbname` + `fields`. Returns value/count buckets.
{"dbname": "yibao", "fields": ["drug_type"], "query": {"province": "江西"}}
```

Rules that cost you a failed call if ignored:

- **`fields` requires `dbname`.** `{"fields": ["province"]}` errors. An empty array also errors.
- **One HTTP request fires per field.** Ask for the 2–4 you need, never all of them.
- **Unknown field names throw**, unlike search. `{"dbname": "yibao", "fields": ["item"]}`
  returns `Unknown facet field(s) for yibao: item. Valid fields: province, drug_type,
  insurance_level, std_catalog_version.` Use discovery mode when unsure.
- **`product_cn` / `reg_cn` are not in the `yaohai-facets` catalog.** Passing them returns
  `supported: false` plus a hint naming the dedicated tool — not an error.
- **Each distribution has its own `success` flag.** A quota limit or a bad field can fail
  one while others succeed, so check every entry rather than assuming the call worked.
- **`drugsales` is the only database with an auto-injected query**: `groupid=205` is merged
  into every facet call and appears in `query_applied`. Your own `query` value overrides it.

The 17 databases with no facet tool (63 − 44 − the 2 dedicated) are documented
individually — each `db-*.md` facet section states *why* (custom route out of scope, no
backend aggregation endpoint, or terms-only extraction), so you can tell "not wired up
yet" from "impossible".

## First decision: marketed vs pipeline

This is the single most common routing mistake.

| Signal in the question | Database | Tool |
|---|---|---|
| 已上市, 批准文号, 国药准字, 上市药品, 医保, 集采, 一致性评价 | `product_cn` | `product-cn-search` |
| 在研, 受理号, 申报, 审评, CDE, IND, NDA 进度, 尚未上市 | `reg_cn` | `reg-cn-search` |
| Ambiguous, or "this molecule overall" | `global_search` | `yaohai-global-search` |

A drug can appear in both: `product_cn` holds approved marketing authorizations,
`reg_cn` holds every CDE submission (including ones that later became approved).
For "what's the competitive landscape of X", query **both** and say which came from where.

## Second decision: which of the 63 databases

| If the question is about… | dbname | Reference file |
|---|---|---|
| A molecule across all markets / no clear target | `global_search` | [db-core.md](reference/db-core.md) |
| China marketed drugs | `product_cn` | [db-core.md](reference/db-core.md) |
| China CDE registration / review | `reg_cn` | [db-core.md](reference/db-core.md) |
| China clinical trials (CTR) | `ct_cn` | [db-core.md](reference/db-core.md) |
| Global clinical trials (ClinicalTrials.gov) | `ct_global` | [db-core.md](reference/db-core.md) |
| US FDA drugs / Orange Book / ANDA / NDA | `product_us` | [db-marketed.md](reference/db-marketed.md) |
| US NDC product listing | `fda_ndc` | [db-marketed.md](reference/db-marketed.md) |
| US DMF (drug master files) | `fda_dmf` | [db-marketed.md](reference/db-marketed.md) |
| EU / EMA medicines | `product_eu` | [db-marketed.md](reference/db-marketed.md) |
| EU mutual-recognition / decentralized procedure | `hma` | [db-marketed.md](reference/db-marketed.md) |
| UK EMC / SmPC | `uk_emc` | [db-marketed.md](reference/db-marketed.md) |
| Japan PMDA approved drugs | `product_jp` | [db-marketed.md](reference/db-marketed.md) |
| Japan DMF registrations | `japan_dmf` | [db-marketed.md](reference/db-marketed.md) |
| Canada DPD | `dpd` | [db-marketed.md](reference/db-marketed.md) |
| Taiwan FDA licences | `tw_fda` | [db-marketed.md](reference/db-marketed.md) |
| HK registered Chinese patent medicines | `cmchk_pcm` | [db-marketed.md](reference/db-marketed.md) |
| HK marketed drugs (Department of Health) | `hk_doh` | [db-marketed.md](reference/db-marketed.md) |
| Macau marketed drugs | `isaf_drugs` | [db-marketed.md](reference/db-marketed.md) |
| Macau TCM & natural drugs | `isaf_tcm` | [db-marketed.md](reference/db-marketed.md) |
| 一致性评价 / 仿制药 产品 | `generic_cn` | [db-registration.md](reference/db-registration.md) |
| 中国新药 (1类/创新药) | `china_new_drugs` | [db-registration.md](reference/db-registration.md) |
| 【随心汇】注册审评聚合 | `drugreg_cn` | [db-registration.md](reference/db-registration.md) |
| 一致性评价品种 (first-pass) | `yzpj_products` | [db-registration.md](reference/db-registration.md) |
| 原辅包 (CDE YFB) 登记 | `cde_yfb_registration` | [db-registration.md](reference/db-registration.md) |
| 国产药品批准文号 (NMPA) | `nmpa_guochan` | [db-registration.md](reference/db-registration.md) |
| 进口药品注册证 (NMPA) | `nmpa_jinkou` | [db-registration.md](reference/db-registration.md) |
| 药品注册专利 / 专利期 | `nmpa_reg_patent` | [db-registration.md](reference/db-registration.md) |
| 补充申请备案 | `nmpa_buchongbeian` | [db-registration.md](reference/db-registration.md) |
| GMP 证书 | `nmpa_gmp` | [db-registration.md](reference/db-registration.md) |
| 中药保护品种 | `nmpa_tcm_protection` | [db-registration.md](reference/db-registration.md) |
| 中药配方颗粒备案 | `nmpa_tcm_granules` | [db-registration.md](reference/db-registration.md) |
| 医保目录 (NHSA) | `yibao` | [db-access-sales.md](reference/db-access-sales.md) |
| 医保编码 / 药品代码 | `nhsa_code` | [db-access-sales.md](reference/db-access-sales.md) |
| 基本药物目录 (基药) | `jiyao` | [db-access-sales.md](reference/db-access-sales.md) |
| 中药饮片医保 | `nhsa_herbs` | [db-access-sales.md](reference/db-access-sales.md) |
| 医疗机构制剂 | `nhsa_hospital_prepration` | [db-access-sales.md](reference/db-access-sales.md) |
| 国家集采中选结果 | `jicai` | [db-access-sales.md](reference/db-access-sales.md) |
| 集采目录 / 品种 | `jicai_mulu` | [db-access-sales.md](reference/db-access-sales.md) |
| 招标中标 (挂网价) | `zhaobiao` | [db-access-sales.md](reference/db-access-sales.md) |
| 医院销售 | `sales_cn` | [db-access-sales.md](reference/db-access-sales.md) |
| 全球年报销售额 | `sales_global` | [db-access-sales.md](reference/db-access-sales.md) |
| 全球药品销售明细 | `drugsales` | [db-access-sales.md](reference/db-access-sales.md) |
| 生物制品批签发 (疫苗) | `bio_issue` | [db-access-sales.md](reference/db-access-sales.md) |
| 医疗器械注册证 (国产) | `medical_device` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 医疗器械备案 (国产 I 类) | `medical_device_beian` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 进口医疗器械注册证 | `medical_device_jinkou` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 进口医疗器械备案 | `medical_device_jinkou_beian` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 国产保健食品批文 | `nmpa_tsspxx_gc` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 进口保健食品批文 | `nmpa_tsspxx_jk` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 中国橙皮书 (目录集) | `cn_orange_book` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 参比制剂 | `cn_reference_drugs` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 参比制剂公示 | `cn_reference_drugs_publicity` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 政府网站药品目录 | `gov_drugs` | [db-policy-devices.md](reference/db-policy-devices.md) |
| 中国医药企业 / 生产许可证 | `cn_company` | [db-reference-news.md](reference/db-reference-news.md) |
| 药品说明书 | `shuomingshu` | [db-reference-news.md](reference/db-reference-news.md) |
| 药物靶点 | `targets` | [db-reference-news.md](reference/db-reference-news.md) |
| 中药材 / 中草药 | `herbs` | [db-reference-news.md](reference/db-reference-news.md) |
| 中药方剂 | `herb_formulas` | [db-reference-news.md](reference/db-reference-news.md) |
| 专利登记 (化学药) | `zldj` | [db-reference-news.md](reference/db-reference-news.md) |
| 专利声明 | `zlsm` | [db-reference-news.md](reference/db-reference-news.md) |
| 药闻 / 行业新闻 | `zb_news` | [db-reference-news.md](reference/db-reference-news.md) |
| 上市公司公告 | `se_notice` | [db-reference-news.md](reference/db-reference-news.md) |
| 药政法规 | `drug_law` | [db-reference-news.md](reference/db-reference-news.md) |

Categories and their database counts (from `yaohai-catalog`): 上市情报 15, NMPA基础库 13,
行业参考 7, 注册情报 6, 市场情报 6, 市场准入 5, 药政参考 4, 药闻速递 3, 临床试验 2,
综合 1, 其他 1 — **63 total**.

## How to prepare keywords (your job, not a tool's)

Before calling a search tool, do this normalization yourself:

1. **Pick the language the database expects.** Chinese databases (`product_cn`,
   `reg_cn`, `yibao`, `jiyao`, `jicai`) match best on Chinese names. International
   databases (`product_us`, `fda_ndc`, `dpd`, `uk_emc`) match best on English INNs.
   `global_search` accepts either and maps synonyms internally.
2. **Strip noise.** Remove dose forms, strengths and pack info from the keyword
   unless you deliberately search `specification` / `std_dosage_form`.
   `阿托伐他汀钙片 20mg` → `item: 阿托伐他汀` + `std_dosage_form: 片剂`.
3. **Use `item` for fuzzy intent, a specific key for precision.** Almost every
   database has an `item` key that searches several fields at once. Use it first;
   switch to `drug_name` / `enterprise` / `auth_num` when you need to narrow.
4. **Prefer facets over guessed values.** Never invent a facet value such as
   `register_type=化药3类`. Fetch it first — `product-cn-facets` / `reg-cn-facets` for
   those two databases, `yaohai-facets` for the other 44 — and copy the exact string.
5. **Use ATC letters for therapeutic areas.** Disease questions ("oncology drugs",
   "降糖药") map to an ATC first-level letter, not a keyword. See
   [atc-therapeutic-classes.md](reference/atc-therapeutic-classes.md).
6. **Split compound questions into separate calls.** "医保目录里有没有阿托伐他汀，
   集采中标了吗" = `yibao` search + `jicai` search, then combine in your answer.

## Query value formats

| Intent | Value shape | Example |
|---|---|---|
| Keyword / phrase | `string` | `{"item": "阿托伐他汀"}` |
| Single enumerated value | `string` | `{"drug_type": "化学药品"}` |
| Multiple enumerated values | `string[]` | `{"province": ["北京市", "上海市"]}` |
| Date range | `"YYYY-MM-DD to YYYY-MM-DD"` | `{"approve_date": "2023-01-01 to 2023-12-31"}` |
| Numeric range | `"min to max"` | `{"general_name_count": "10 to 50"}` |
| Numeric equality | `number` | `{"year": 2024}` |
| Boolean-ish flag | `1` / `0` | `{"only_active": 1}`, `{"rows_excluded": 1}` |

Full semantics — including how `search_mode` changes matching, and the silent-drop
behaviour for malformed ranges — are in [query-syntax.md](reference/query-syntax.md).

## Limits and pagination

| Tool | Default `limit` | Max `limit` |
|---|---|---|
| `product-cn-search`, `reg-cn-search` | 20 | 100 |
| `yaohai-search`, `yaohai-global-search` | 10 | 50 |

Use `offset` to page. The total match count comes back as `total` (the raw API
field is `tnum`). Never request more than you will actually show.

**1000-row window per query condition (client + server enforced):** `offset + limit`
is capped at 1000 for one set of filters — changing `offset` never unlocks more rows.
When you hit the edge, narrow the filters (date / province / ATC / enterprise) and
re-query; each new condition gets its own window.

## Standard workflow

1. Route (tables above) → pick `dbname` + tool.
2. Open the matching `reference/db-*.md` file → confirm field keys, facet keys,
   `filter_type`, `view_types`, `has_detail`. Its **Facetable** column tells you which
   keys `yaohai-facets` accepts; when in doubt call discovery mode
   (`{"dbname": "<db>"}`) for the authoritative list.
3. Prepare the query per "How to prepare keywords".
4. If the question implies a category filter you don't know the exact value of,
   call the facets tool first and read the real values (`product-cn-facets` /
   `reg-cn-facets` / `yaohai-facets` — see "Facets: three tools, two behaviours").
5. Search. Read `total`.
6. If `total > 20`, do **not** dump the table — follow
   [result-presentation.md](reference/result-presentation.md).
7. Drill down with the detail tool only when the user needs one record. `id` must
   be the encrypted id from the search items, never a raw 批准文号 / 受理号.
8. When the result carries a frontend link, include it so the user can verify.

## Gotchas

- **`product_cn` defaults to `search_mode=3` (partial match); `reg_cn` defaults to
  `search_mode=1` (related).** Same keyword, different result sets. Set it explicitly
  when comparing across the two.
- **`reg_cn` defaults to `rows_excluded=1`** — 备案 (filing) submissions are dropped.
  Pass `rows_excluded=0` to include them.
- **`approve_date` is the latest re-registration date, not first launch.** For
  "when was X first approved" use `first_approve_date`.
- **`ATC_code` facets return only the first-level letter** (e.g. `C`), not full codes
  like `C10AA05`. Use [atc-therapeutic-classes.md](reference/atc-therapeutic-classes.md).
- **`global_search` has no facet tool.** It is a `custom` route, so `yaohai-facets` does
  not cover it (the backend endpoint exists but is not wired up). Its `dbname` facet
  returns an empty list and `rd_status` / `year` are frequently empty. Use it for
  discovery, then re-query the specific database for filtering.
- **`product-cn-facets` / `reg-cn-facets` responses always report `filter_type: "multiple"`**
  even for their date and range fields, and date facet values come back as epoch
  milliseconds. There is no `type` key in the payload — `filter_type` is the only one.
  `yaohai-facets` cannot hit this: it exposes `terms` fields only, so no date or range
  field is ever fetchable through it. The `date` / `range` / `tree` `filter_type` in the
  reference tables is the *frontend* rendering hint and tells you which value grammar to
  send back when filtering — not what the facet response will say.
- **A date facet is not a timeline, and 1 January is not a day.** Date facets return one
  bucket per distinct day, count-sorted and capped at 100, so the default view is the 100
  *busiest* days. On `product_cn`, 29 of those are `YYYY-01-01` placeholders holding 86% of
  the reported rows, because older records store **year only** (`listing_date: "1996"`) and
  the backend materializes the year as 1 January. Never say "approved on 1996-01-01"; for a
  by-year breakdown, run one filtered search per year and read `total`. See
  [result-presentation.md](reference/result-presentation.md#year-only-dates-masquerade-as-1-january).
- **Never facet the same field you are filtering on.** The facet call strips that field
  from the query first, so you get the *unfiltered* distribution and a false sense of
  confirmation. Facet `ATC_code` to *discover* a molecule's class; use a plain search and
  read `total` to *confirm* a class filter worked.
- **`drugsales` requires VIP (`groupid=205`)** and is slow without filters — always
  pass `year` and a drug/company key.
- **15 databases have `has_detail: false`** — a detail call will fail or return nothing.
  Use the list fields instead. They are: `nmpa_tcm_protection`, `nmpa_buchongbeian`,
  `japan_dmf`, `product_jp`, `isaf_drugs`, `isaf_tcm`, `fda_dmf`, `cmchk_pcm`,
  `drugsales`, `sales_cn`, `sales_global`, `yzpj_products`, `china_new_drugs`,
  `herb_formulas`, `herbs`.
- **`yaohai-search` with `dbname=product_cn` or `dbname=reg_cn` is a mistake** when the
  dedicated tools apply — they add view types, facets and field discovery.
- **Unknown field keys are silently dropped — this is the most dangerous gotcha.**
  A query of `{"bogus_field": "阿托伐他汀"}` returns HTTP 200 with `total` equal to the
  **entire database** (243,104 rows for `product_cn`) and no error at all. Always
  confirm your field key exists (via `*-fields` or the reference file), and sanity-check
  that `total` dropped after adding a filter.
- **Malformed ranges do the opposite: they hard-error with HTTP 400.**
  `"20-50"` → `number_format_exception`; `"2024/01/01-2024-12-31"` → `parse_exception`.
  Only `"A to B"` is accepted. A 400 means your syntax was wrong, not that the filter
  matched nothing.
- **`gj_passed_yizhi` is a virtual OR filter** on `product_cn`: it matches
  `is_passed_yizhi=1 OR is_orange_book=1`. It does not exist as a stored field.
- **`detail_url` inside `product-cn-search` / `reg-cn-search` items is
  `https://db.drugsea.cn/api/disabled`** — it is not a usable link. Use the detail tool
  with the item's `id` instead. `yaohai-search` and `yaohai-global-search` do return
  working `detail_url` values.
- **`ATC_code` in returned rows is a Chinese class name** (e.g. `心血管系统`), but the
  **filter value is a single letter** (e.g. `C`). Do not copy row values into filters.
- **Result item shape differs between tools.** `product-cn-search` and `reg-cn-search`
  return each row **flattened** (`items[0].drug_name`). `yaohai-search` and
  `yaohai-global-search` return each row **nested** (`items[0].fields.drug_name`, with
  `items[0].detail_url` as a sibling). Check the shape before you read fields.
- **Every response includes `field_labels`** — a key → Chinese label map for the
  columns it returned. Use it to label your output instead of guessing.

## Reference files

| File | Contents |
|---|---|
| [reference/query-syntax.md](reference/query-syntax.md) | Value type → ES clause, `search_mode` per DB, date/range grammar, caps, silent-drop |
| [reference/atc-therapeutic-classes.md](reference/atc-therapeutic-classes.md) | ATC first-level letters ↔ therapeutic areas, disease → letter mapping |
| [reference/db-core.md](reference/db-core.md) | `global_search`, `product_cn`, `reg_cn`, `ct_cn`, `ct_global` — full field/facet detail |
| [reference/db-marketed.md](reference/db-marketed.md) | 上市情报 international (US/EU/UK/JP/CA/TW/HK/Macau) — 14 DBs |
| [reference/db-registration.md](reference/db-registration.md) | 注册情报 + NMPA approval records — 12 DBs |
| [reference/db-access-sales.md](reference/db-access-sales.md) | 市场准入 + 市场情报 + 其他 — 12 DBs |
| [reference/db-policy-devices.md](reference/db-policy-devices.md) | Devices, health food, 药政参考 — 10 DBs |
| [reference/db-reference-news.md](reference/db-reference-news.md) | 行业参考 + 药闻速递 — 10 DBs |
| [reference/examples.md](reference/examples.md) | ~15 end-to-end question → exact tool call cookbook |
| [reference/result-presentation.md](reference/result-presentation.md) | `total > 20` summarizing rules and output templates |
