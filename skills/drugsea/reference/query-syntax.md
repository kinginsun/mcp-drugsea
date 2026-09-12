# Query syntax reference

How a `query` object is translated into an actual search, what each value shape means,
and where it goes wrong.

Source of truth: `backend/drugsea_api/src/functions_from_core.php` → `make_es_condtions()`
(ES databases) and the per-route `make_*_search_sql()` helpers (MySQL databases), plus
`backend/drugsea_api/src/routes/products/bj_api2.php` (`product_cn`) and
`backend/drugsea_api/src/routes/china_reg/qy2.php` (`reg_cn`).

## Value type → clause

| You send | Backend does | Example |
|---|---|---|
| `string` that does **not** match a range pattern | `match_phrase` on that field | `{"drug_name": "阿托伐他汀钙片"}` |
| `string` matching `YYYY-MM-DD to YYYY-MM-DD` | `range` gte/lte on a date field | `{"approve_date": "2023-01-01 to 2023-12-31"}` |
| `string` matching `\d+ to \d+` | `range` gte/lte on a numeric field | `{"general_name_count": "20 to 50"}` |
| `string[]` | `terms` (exact match against `field.keyword`) | `{"province": ["北京市", "上海市"]}` |
| `number` | `match_phrase` on the coerced string | `{"year": 2024}` |
| `boolean` | serialized to `"1"` / `"0"` then `match_phrase` | `{"only_active": true}` |
| `null`, `""`, `undefined` | **field is dropped entirely** — no clause at all | `{"indication": ""}` |

Key detail: a `string[]` is matched with `terms`, which is **exact whole-value matching**,
not substring matching. `{"province": ["北京"]}` will match nothing if the stored value
is `北京市`. Always copy facet values verbatim.

A single `string` is matched with `match_phrase`, which **is** analyzed and therefore
does substring/token matching. This asymmetry is intentional: use a string for fuzzy
keyword search, use an array only for exact enumerated values.

## The range grammar is strict

Two regexes are the only accepted forms:

```
/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/     # date range
/^(\d+) to (\d+)$/                                  # integer range
```

Notes:
- The separator is the literal word ` to ` — spaces required, lowercase.
- Date format must be `YYYY-MM-DD` with zero-padding. `2024-1-1` will **not** match the
  regex and falls through to `match_phrase`, which then fails in Elasticsearch.
- Ranges must be non-negative integers. No decimals, no negative numbers.
- Both ends are **inclusive** (`gte` / `lte`).

### What happens when you get it wrong

Malformed ranges are **not** silently ignored. They fall through to `match_phrase`,
which passes the raw string to Elasticsearch and produces an **HTTP 400**:

| You sent | Result |
|---|---|
| `{"general_name_count": "20-50"}` | 400 `number_format_exception: For input string: "20-50"` |
| `{"first_approve_date": "2024/01/01-2024-12-31"}` | 400 `parse_exception: failed to parse date field` |
| `{"first_approve_date": "2024-01-01 to 2024-12-31"}` | 200, correctly filtered |

Elasticsearch accepts date values in `yyyy-MM-dd HH:mm:ss || yyyy-MM-dd || epoch_millis`.

**A 400 error means your syntax was wrong.** It does not mean "no matches".

## Unknown field keys (web still silent; MCP is explicit) {#the-real-silent-failure-unknown-field-keys}

The **web list APIs** still skip unknown keys inside `make_es_condtions()` and can fall
back to `match_all` (the whole database, HTTP 200). That is unchanged for the SPA.

**MCP search does not.** mcp-drugsea (and the Yaohai MCP route after deploy) rewrite
known aliases (`sponsor` → `study_sponsor`, `substance` → `active_substance`, …),
echo `query_aliases` / `query_ignored` / `warnings`, and **error** if every user filter
key is unknown. A call like `{"bogus_field_xyz": "阿托伐他汀"}` must fail — it must not
return 243k rows.

If an old session still silent-drops unknown keys, **reload the MCP server**. Confirm
keys with `product-cn-fields` / `reg-cn-fields` or the `db-*.md` files. After a
successful search, still check that `total` dropped when you added a real filter.

### But the field lists are not exhaustive either

Three different "authoritative" sources disagree, and **all of them are incomplete**:

| Source | What it lists | Gap |
|---|---|---|
| MCP `product-cn-fields` `common_search` | the keyword-panel keys plus verified extras such as `brand_name` | still omits some ES-only keys |
| catalog `search_fields` | 3–5 headline keys per database | omits `item` on many databases where `item` works |
| the database's ES mapping | every accepted key | not exposed through any tool |

Verified: `{"brand_name": "立普妥"}` returns 62 rows. A key missing from a short catalog
list is not proof the key is invalid — but an **unknown** key on MCP must error, not
return the whole database.

The reliable test is behavioural. Send the key and read `total`:

| `total` | Meaning |
|---|---|
| equals the unfiltered database size | filter did not apply (wrong key on the web API, or only control keys left) — try another key |
| smaller than the full size | key is **valid**, and it filtered |
| `0` | key is valid but the **value** matched nothing (wrong language, wrong form) |
| HTTP 400 | value is **malformed** for that field's type |

Because the docs under-report, prefer keys you have seen work. The per-database
`db-*.md` files mark which keys were verified live versus merely inferred from source.

## `search_mode` semantics

`search_mode` exists on `product_cn`, `reg_cn`, `drugreg_cn` and `generic_cn`. It is
applied **before** the query is built and rewrites which field key your keyword targets and
whether the value is a string or an array. It is not a match-type switch.

**Pass `search_mode` inside the `query` object.** A top-level `search_mode` is now
hoisted into `query` when the query omits it (mcp-drugsea ≥ this release). Prefer
the in-query form so older servers still work:

```jsonc
{"query": {"drug_name": "甲磺酸奥希替尼片", "search_mode": 2}, "limit": 20}   // ✓
{"query": {"drug_name": "甲磺酸奥希替尼片"}, "search_mode": 2, "limit": 20}   // hoisted
```

| `search_mode` | UI label | What it does to `drug_name` |
|---|---|---|
| `1` | 相关检索 / related | Moves the value to `related_drug_names` and **deletes** `drug_name`. Matches the pre-built synonym field containing Chinese names, English names, brand names and transliterations. |
| `2` | 完整匹配 / exact | Wraps the value as a single-element array → `terms` on `drug_name.keyword`. Exact whole-value match. Also exact-matches `enterprise` and `slh` on `reg_cn`. |
| `3` | 部分匹配 / partial | Leaves the value as a string → `match_phrase` on `drug_name`. Token/substring match. |

On the MySQL-engine databases (`drugreg_cn`, `generic_cn`) the same 1/2/3 values map to
`exact = 0 / 1 / 2`, which selects between a `FULLTEXT … IN BOOLEAN MODE` lookup, a `LIKE`
join on the name index, and a `LIKE '%…%'` substring match.

### Mode 2 requires the full product name

Because mode 2 is exact whole-value matching, the value must equal a stored `drug_name`
**exactly — including the dosage form**. The ingredient alone matches nothing. Verified on
`reg_cn`:

```jsonc
{"query": {"drug_name": "奥希替尼", "search_mode": 2}}         // → total 0   ✗
{"query": {"drug_name": "甲磺酸奥希替尼片", "search_mode": 2}}   // → total 87  ✓
```

If you only know the ingredient, use mode `1` or `3`, or run one first to discover the exact
product name and then narrow with mode 2.

### Defaults differ between the two databases

| Database | Default `search_mode` | Other defaults |
|---|---|---|
| `product_cn` | **3** (partial) | — |
| `reg_cn` | **1** (related) | `rows_excluded=1` (drops 备案 filings) |

So the *same* keyword sent to both databases with no explicit `search_mode` hits different
fields with different match semantics. When comparing marketed vs pipeline counts for the
same molecule, **set `search_mode` explicitly on both calls** or the numbers are not
comparable.

`search_mode` only affects `drug_name` (plus `enterprise` / `slh` under mode 2 on
`reg_cn`). It does **not** change how `item`, `indication`, `manufacture` or facet
filters behave.

### `item` vs `drug_name`

`item` is the broad full-text field the web UI's main search box uses. It searches across
several columns at once (name, company, identifier, sometimes indication). It is **not**
affected by `search_mode`.

Practical guidance:
- Start with `item` for exploratory searches.
- Switch to `drug_name` / `general_name` / `enterprise` / `auth_num` / `slh` when you need
  precision or when you want `search_mode` to apply.
- `item` is not available on every database — check the reference file. Where absent, use
  the most specific key listed.

## Other per-field rewrites worth knowing

These are applied by the route handlers, not by you:

| Field | Behaviour |
|---|---|
| `auth_num` (`product_cn`) | If the value contains `;`, it is split into an array → `terms`. So `"国药准字H1;国药准字H2"` searches both. |
| `slh` (`reg_cn`) | Same `;` splitting. Multi-acceptance-number search in one call. |
| `source` (`product_cn`) | Always coerced to an array → `terms`. Values are codes `G` (国产) / `J` (进口), but the **facet response returns readable labels** (`国产` / `进口`). Send the label. |
| `only_active=1` (`product_cn`) | Sets `in_sfda=1`, overriding anything you passed for `in_sfda`. |
| `in_sfda=0` (`product_cn`) | **Honoured on the default `eslist` search** (invalid approvals only). Facet aggregations and `list_by_drug_name` / `list_by_manufacture` still drop `in_sfda=0`. |
| `rows_excluded` (`reg_cn`) | Empty/falsy values are dropped. Send `1` to exclude 备案, `0` to include. |
| `gj_passed_yizhi=1` (`product_cn`) | **Virtual OR field**, not stored: matches `is_passed_yizhi=1 OR is_orange_book=1`. Verified: 阿托伐他汀 → 117 rows. |

## Facet calls

Three tools produce facet distributions, and they do not share a coverage model:

| Tool | Covers | Fetchable fields |
|---|---|---|
| `product-cn-facets` | `product_cn` | 22 (17 multiple, 2 date, 3 range) |
| `reg-cn-facets` | `reg_cn` | 22 (17 multiple, 2 date, 3 range) |
| `yaohai-facets` | 58 databases (`/in` + dedicated-route) | 209, **`terms` only** (+ static SPA lists) |

Facets use the same `query` object as the search, with two differences:

1. The field being faceted is **removed from the query** before the aggregation runs, so
   you can see the full distribution of that dimension rather than only the value you
   already filtered to. Other filters still apply. (`fetchFacets` does
   `delete facetQuery[field]` per field.)
2. MCP facets use the **catalog** `filter_type` (the raw backend payload still hard-codes
   `type=multiple`). Date buckets are formatted as `YYYY-MM-DD` (UTC). When a terms
   aggregation returns 100 buckets, the field is marked `truncated: true` — raise
   `query.maxSize` if you need the long tail. `yaohai-facets` is still **terms-only**.

### `yaohai-facets` throws; MCP search no longer silent-drops

| | Unknown field key |
|---|---|
| `yaohai-search` / dedicated search (MCP) | **errors** if every user filter key is unknown; otherwise `query_ignored` |
| Web list API | still **silently dropped** → HTTP 200, `total` = whole database |
| `yaohai-facets` | **throws** → `Unknown facet field(s) for yibao: item, bogus. Valid fields: …` |

A facet call is still a cheap way to list valid facet field names. For search keys, rely
on `*-fields`, the `db-*.md` files, and the MCP error / `query_ignored` echo.

Related errors, all of them loud:

- `fields` without `dbname` → error telling you to omit `fields` for discovery mode.
- `fields: []` → rejected by schema.
- `product_cn` / `reg_cn` → **not** an error; returns `supported: false` plus a `hint`
  naming the dedicated tool, and a `did_you_mean` list for near-miss dbnames.

### Discovery mode

Omit `fields` and the tool describes what it can aggregate instead of aggregating:

```jsonc
{}                              // all 58 databases, their titles, categories, field names
{"dbname": "yibao"}             // one database: facet_count, facet_prefix, fields + titles
```

Discovery exists precisely so you never guess a field name. Use it whenever a
`db-*.md` facet table looks incomplete — remember those tables are extracted from the
frontend panel, which is a superset in some places (date/range/tree keys the tool will
reject) and can be a subset in others.

### Cost model: one HTTP request per field

`fetchFacets` loops `for (const field of opts.fields)` and issues a separate GET for each.
Asking for everything means 209 requests. Request the 2–4 dimensions you will actually
use — the same discipline the dedicated tools need (5–6 max of their 22).

### Per-database injected query

`drugsales` is the only entry with a `defaultQuery`, and it is `{"groupid":"205"}` — the
VIP gate. It is merged **under** your query, so it applies automatically and your own
value still wins:

```jsonc
{"dbname": "drugsales", "fields": ["drug_type"]}
// → query_applied: {"groupid": "205"}
{"dbname": "drugsales", "fields": ["drug_type"], "query": {"groupid": "999"}}
// → query_applied: {"groupid": "999"}   (caller overrides)
```

Expect `groupid` to show up in `query_applied` even though you did not send it.

### Facets are rate-limited and can fail *softly*

Facet calls are subject to a **daily per-user quota**. When you exceed it, the request
still returns HTTP 200 and the distribution object is still present — but the field comes
back failed:

```jsonc
"distributions": {
  "rd_status": {
    "success": false,
    "error": "您今日已达当前页面最大访问量，请升级或明日再来（微信：xinhukefu）。",
    "title": "研发状态"
  }
}
```

**Always check `success` on each distribution before using it.** A failed field has no
`items` key at all, and `yaohai-facets` keeps going after one field fails — so a multi-field
call can return a mix of good and failed distributions. Searches are not subject to this
limit in the same way, so fall back to a plain search with an explicit filter and read
`total`.

### Facet counts are not exact and do not sum to `total`

Two independent effects, and they are worth separating because they call for different
remedies.

**1. A hard 100-bucket cap silently truncates the long tail.**

This is a property of `es_aggs()`, so it applies to **all three facet tools**, not just
`yaohai-facets`. Verified live 2026-09-06 that `product-cn-facets` and `reg-cn-facets`
honour `maxSize` too: `product-cn-facets` on `std_dosage_form` returns 100 buckets summing
to 242,884 by default and **165** buckets summing to 243,086 with `maxSize: 500` — a
165-value field silently rendered as 100. `maxSize: 3` returns exactly 3 buckets on both
dedicated tools, confirming it is a plain bucket limit everywhere.

`es_aggs()` builds the ES `terms` aggregation with `"size" => $maxSize`, where
`$maxSize = get_and_delete($params, 'maxSize', 100)`, ordered by `_count desc`. So the
default response is the **top 100 values by count** and every value below that is dropped
without any indication. Because `maxSize` is deleted from params before
`make_es_condtions()`, it is a clean knob, not a filter — you can pass it in `query`:

```jsonc
{"dbname": "jicai", "fields": ["jc_project"]}
// 100 buckets, sum = 891,595
{"dbname": "jicai", "fields": ["jc_project"], "query": {"maxSize": 500}}
// 128 buckets, sum = 892,528   ← the field really has 128 values
```

Verified live. `herbs.efficacy_class` shows the same shape: 100 buckets summing to 11,899
by default versus 1,000 buckets summing to 14,301 with `maxSize: 1000` — the default view
hides 2,402 rows (17% of the data) and you would never know from the response. `maxSize: 5`
returns 5 buckets summing to 3,743, confirming it is a plain bucket limit.

Note `maxSize` is echoed into `query_applied` even though it is not a filter, so do not
read `query_applied` as "the filters that were applied".

**Rule: if you get exactly 100 buckets, the list is truncated.** Raise `maxSize` before
computing any sum, share, or "which value is most common beyond the obvious ones"
statement. Counts do come back monotonically non-increasing, so the first bucket is always
the true mode.

**2. `terms` aggregations exclude documents where the field is empty.**

Observed on `reg_cn` for `drug_name=奥希替尼` (`search_mode=1`):

| Source | Value |
|---|---|
| Search `total` | **100** |
| Facet `rd_status` buckets | 已完结 **59**, 已上市 **20**, 在研 **9**, 终止 **2** = 90 |
| Search filtered to `rd_status="已完结"` | **69** |
| Search filtered to `rd_status="已上市"` | **20** |

Only 4 buckets here, so the cap is not involved. Two things are going on instead:

- The 已完结 bucket says 59 but an equivalent filtered search says **69**. Facet counts come
  from a cached aggregation and can lag the index.
- The buckets sum to 90, not 100. Elasticsearch `terms` aggregations **exclude documents
  where the field is empty or missing**, so the missing 10 rows have no `rd_status`.

Practical rule: **use facets to discover which values exist and their rough shape. Never
quote a facet count as a precise figure.** When a number goes into an answer, confirm it
with a filtered search and cite `total` instead.

Verified live on `yibao` (`yaohai-facets`, v0.4.0): `drug_type` unfiltered gives
西药 64,476 / 中药 61,340 / 中药饮片 1,901 = 127,717 across 3 buckets — complete, since 3 is
far below the cap. Adding `{"province": "江西"}` narrowed `insurance_level` to 乙 4,658 /
甲 1,431 = 6,089 (versus 125,687 unfiltered). The filter demonstrably propagates into the
aggregation, which is what makes facets useful for narrowing.

Also worth knowing: `uk_emc.ATC_code` returns **bare first-level letters** (N=4,157,
C=2,007, L=1,901, A=1,793, J=1,595 …) confirming the letter-only rule from
[atc-therapeutic-classes.md](atc-therapeutic-classes.md) on a third database. And
`cn_orange_book.is_reference_drug` includes junk buckets — `/`=9 and `空`=3 — so real data
contains placeholder values you may need to mention or exclude.


`filter_type` values in the reference files are the **frontend rendering hint**, and they
tell you which value grammar to send back as a filter:

| `filter_type` | Value grammar to send | Facet value you see | `yaohai-facets` |
|---|---|---|---|
| `multiple` | exact string or `string[]` copied verbatim | readable label | ✓ fetchable |
| `date` | `"YYYY-MM-DD to YYYY-MM-DD"` | epoch ms bucket | ✗ throws |
| `range` | `"min to max"` | raw number bucket | ✗ throws |
| `tree` | hierarchical code (ATC tree); rarely needed via MCP | tree node | ✗ throws |

The per-database `db-*.md` facet tables carry a **Facetable** column:

| Value | Meaning |
|---|---|
| ✓ | `yaohai-facets` / dedicated `*-facets` can fetch buckets |
| `SPA list` | hardcoded panel list — `yaohai-facets` returns values with `count: null` |

### SPA condition filters vs yaohai-facets

Every list page has 条件筛选. **Source of truth is the frontend route's
`ConditionSearchPanel.js`** (`queryKey` on **rendered** panels). `yaohai-facets`
fetches **terms** buckets for 58 databases (44 `/in` + dedicated-route pages). Date
pickers are still not fetchable. `product_cn` / `reg_cn` keep dedicated tools.

| dbname | SPA `queryKey` (rendered terms) | `yaohai-facets` |
|---|---|---|
| `zhaobiao` | `bid_type`, `province`, `unit`, `min_unit`, `notice_year`, `execute_status`, `category` | ✓ `GET /es/zhaobiao/list/{field}` |
| `cn_company` | `province`, `std_classification` | ✓ `GET /enterprise/eslist/{field}` (dates not fetchable) |
| `ct_cn` | `reg_type`, `ct_status`, `study_phase`, `drug_type`, `study_type`, `source` | ✓ `GET /c/cde/ct/eslist/{field}` |
| `ct_global` | `ct_status`, `study_phase`, `has_result`, `study_type` | ✓ `GET /us/ct/eslist/{field}` |
| `shuomingshu` | `source`, `has_sms`, `has_package_pics` | ✓ `GET /sms/eslist/{field}` |
| `bio_issue` | `issue_conclusion`, `source` | ✓ `GET /c/pqf/eslist/{field}` |
| `product_eu` | `year`, `drug_type`, `status`, `tags`, `ATC_code`, `therapeutic_area` | ✓ `GET /ema_drugs/eslist/{field}` |
| `product_jp` | `year`, `category_cn`, `drug_type`, `is_effect`, `ATC_code` | ✓ `GET /jp_drugs/eslist/{field}` |
| `product_us` | `ApplyType`, `year`, `ReviewPriorityOrphanStatus`, `MarketingStatus`, `RLD`, `SubmissionClassification`, `drug_type`, `InnovatorOrGeneric` | ✓ `GET /fda_drugs/eslist/{field}` |
| `sales_cn` | `years`, `quarter`, `drug_type`, `administration_route`, `ATC_code`, `city` | ✓ static SPA list (`count` null) |
| `sales_global` | `years`, `source` | ✓ static SPA list (`count` null) |
| `china_new_drugs` | `rd_status`, `apply_type`, `conclusion`, `transact_status`, `register_type`, `special_list`, `drug_type`, `dosage_form`, `slh_types`, `ATC_code`, `prov_abs` | ✓ `GET /b/drugreg/cn/list/{field}` (reg_cn list aggs) |
| `generic_cn` | `drug_type`, `dosage_form` | ✓ `GET /generic/cn/list/{field}` (needs drugsea_api deploy) |
| `drugreg_cn` | 16 terms `is_condition` fields | ✓ `GET /drugreg_cn/aggs/filter/{field}` |
| `global_search` | `dbname` | not in catalog (parent-supplied list) |
| `medical_device_beian` / `_jinkou_beian` | `filing_date` | date picker only — not in catalog |

## Limits and offsets

| Tool | Default `limit` | Max `limit` | Notes |
|---|---|---|---|
| `product-cn-search` | 20 | 100 | clamped, not errored |
| `reg-cn-search` | 20 | 100 | clamped, not errored |
| `yaohai-search` | 10 | 50 | clamped, not errored |
| `yaohai-global-search` | 10 | 50 | clamped, not errored |

`offset` is clamped to `>= 0` and truncated to an integer. Passing `limit: 5000` silently
becomes the max — it does not fail. Responses echo `limit_requested` / `limit` /
`max_retrieve` when a clamp happened.

**1000-row window per query condition:** `offset + limit` cannot exceed 1000. An
`offset` already at or past 1000 is rejected. Narrow the filters instead of paging
deeper. The same cap is enforced by the MCP client and the Yaohai MCP API.

Total match count is `total` in the MCP response (the raw backend field is `tnum`).

## Three engines

Which engine runs depends on `route_type` / `api_path` in the catalog. This matters
because the same value grammar behaves differently.

### 1. Elasticsearch (`route_type: dbs`, or `custom` with `/eslist` **or** `/es/`)

Full `make_es_condtions()` semantics as described above: `match_phrase` for strings,
`terms` for arrays, strict regex range parsing, `search_mode` rewriting.

The `/es/` prefix is the tell, not the `/list` suffix. `zhaobiao` is `custom` with
`api_path` `/es/zhaobiao/list` and runs on Elasticsearch (`view_zhaobiao`). Treating
any path that merely *ends* in `/list` as MySQL misclassifies it.

### 2. MySQL (`custom`/`dbs` with `/list`, and **not** under `/es/`)

Uses per-database `make_*_search_sql()` helpers. Verified differences:

| Aspect | ES | MySQL |
|---|---|---|
| Date filter | regex `A to B` → `range`; **anything else → `match_phrase`** | `explode(' to ', $v)`; 2 parts → `whereBetween`, otherwise `where = $v` |
| Numeric range | `"min to max"` only | usually not supported |
| Name search | `match_phrase` (analyzed) | `LIKE '%x%'` or `FULLTEXT … IN BOOLEAN MODE` |
| Facets | ES aggregations | `GROUP BY` |

**A bare single date works on both engines**, by different mechanisms. On MySQL it becomes
an equality `where`; on ES it falls through to `match_phrase`, which parses fine because
the string *is* a valid date. Verified on `reg_cn` (an ES database):

```jsonc
{"query": {"undertake_date": "2024-05-01"}}   // → 24 rows, all undertaken that day
```

Use this for "what happened on day X" questions — it is cleaner than a same-day range.

The 400 errors come from values that reach `match_phrase` but are **not valid instances of
the field's ES type**. `20-50` is not a valid integer, `2024/01/01-2024-12-31` is not a
valid date. A well-formed bare value never errors. So:

> 400 = your value is malformed for that field's type. 0 results = value is well-formed but
> nothing matches. Silent full-DB return = the field *key* is unknown.

MySQL-engine databases include `yzpj_products`, `generic_cn`, `china_new_drugs`,
`sales_cn`, `sales_global`, `global_search`.

### 3. Aggregation engine (`route_type: aggs`)

Only **`drugreg_cn`** uses this. It does **not return rows** — it returns `GROUP BY`
buckets. Default grouping is `sumBy=['general_name']`, `sumTarget='slh'`, so a plain
search yields:

```jsonc
{"total": 12, "items": [
  {"fields": {"general_name": "阿托伐他汀培哚普利氨氯地平", "count": "4"}},
  {"fields": {"general_name": "阿托伐他汀培哚普利", "count": "3"}}
]}
```

`count` is `count(distinct slh)` — the label is `数量(受理号)`. `total` is the **number of
groups**, not the number of underlying records.

**You control the grouping** by passing `sumBy` / `sumTarget` inside `query`. Verified:

```jsonc
// yaohai-search dbname=drugreg_cn
{"query": {"drug_name": "阿托伐他汀", "sumBy": "enterprise", "sumTarget": "slh"}, "limit": 3}
// → total 247 groups: 齐鲁制药有限公司:8, 齐鲁制药(海南)有限公司:6, 默沙东研发(中国)有限公司:4
```

Valid `sumBy` values are the 21 `aggregate_by` fields and valid `sumTarget` values are the
5 `aggregate_target` fields listed in [db-registration.md](db-registration.md). Passing
anything else produces a SQL error. `sumBy` may be a string or an array; multi-field
grouping produces one bucket per combination.

Use `drugreg_cn` when the question is "how many / which companies / which ingredients"
— a counting question. Use `reg_cn` when you need the actual submission records.

## Response shape

```jsonc
{
  "dbname": "yibao",
  "title": "医保目录",
  "category": "市场准入",
  "total": 54,              // ← total matches (tnum)
  "limit": 3,
  "offset": 0,
  "count": 3,               // ← rows actually returned
  "items": [ … ],
  "query_applied": { … },   // ← echo; includes injected defaults like search_mode
  "field_labels": { "drug_name": "药品名称", … }   // ← key → Chinese label
}
```

Item shape differs by tool:

| Tool | Item shape |
|---|---|
| `product-cn-search`, `reg-cn-search` | **flat**: `items[0].drug_name` |
| `yaohai-search`, `yaohai-global-search` | **nested**: `items[0].fields.drug_name`, with `items[0].detail_url` as a sibling |

Use `field_labels` to label output columns rather than guessing translations.

`detail_url` reliability:

| Tool | `detail_url` |
|---|---|
| `yaohai-search`, `yaohai-global-search` | working API URL |
| `product-cn-search`, `reg-cn-search` | rebuilt when possible; ignore any URL containing `/api/disabled` |

For `product_cn` / `reg_cn`, drill down with `product-cn-detail` / `reg-cn-detail`.
Prefer the item's encrypted `id` (e.g. `irzQMmzjVihRxUrrbc-vtw**`). A raw 批准文号 or
受理号 is accepted as a fallback and resolves the same record.

## Quick pre-flight checklist

1. Is the field key real for this database? (check reference file or `*-fields`)
2. Is the value the right shape — string for fuzzy, `string[]` for exact enumerated?
3. Are dates `YYYY-MM-DD` and ranges `min to max` with literal ` to `?
4. Did I set `search_mode` explicitly if comparing `product_cn` and `reg_cn`?
5. Did `total` drop after adding my filter? If not, the key did not apply (or MCP
   returned `query_ignored`). Reload the MCP server if unknown keys still silent-drop.
