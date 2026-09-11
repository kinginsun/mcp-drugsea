# Core databases

The three highest-traffic databases plus clinical trials. Most questions land here. Read [query-syntax.md](query-syntax.md) first — `product_cn` and `reg_cn` have non-obvious `search_mode` defaults.

5 databases: `product_cn`, `ct_global`, `ct_cn`, `reg_cn`, `global_search`

---

## `product_cn` — 国内上市药品

**Category** 上市情报 · **Route type** `custom` · **Frontend** `/product/cn` · **API path** `/product/cn/eslist` · **Detail** yes

*Catalog keywords:* 国内上市, 批文, 国药准字, NMPA

| MCP tool | |
|---|---|
| Search | `product-cn-search` |
| Field keys | `product-cn-fields` |
| Facets | `product-cn-facets` |
| Detail | `product-cn-detail` |

> Marketed China drugs. Use the dedicated `product-cn-*` tools, not `yaohai-search`. Catalog `search_fields` match the SPA「关键词查询」panel. Default `search_mode` is **3** (部分匹配). 「仅有效文号」is `only_active=1`. Items come back **flat** (`items[0].drug_name`), and `detail_url` in list rows is `https://db.drugsea.cn/api/disabled` — drill down with `product-cn-detail` using the row's `id`. See [query-syntax.md](query-syntax.md) for `search_mode`, the `gj_passed_yizhi` virtual OR field, and `in_sfda` behaviour.

### Common search fields (from `*-fields` / SPA keyword panel)

| Key | Verified | Meaning |
|---|---|---|
| `item` | ✓ | 中英药名/企业/适应症/批准文号 |
| `drug_name` | ✓ | 中文药名 |
| `manufacture` | ✓ | 生产企业 |
| `license_holder` | | 持证商 |
| `specification` | | 原始规格 |
| `std_specification` | | 标准规格 |
| `auth_num` | ✓ | 批准文号 |
| `indication` | | 适应症 |
| `only_active` | | 仅有效文号（=1） |
| `search_mode` | | 检索模式（1相关/2完整/3部分，默认3） |

This is **not** an exhaustive key list — `*-fields` returns the keys the search UI exposes, and the ES mapping accepts more. Verified example: `brand_name` is absent from this table yet `{"brand_name": "立普妥"}` returns 62 precise rows. A key missing here is therefore not proof it is invalid; see [query-syntax.md](query-syntax.md#but-the-field-lists-are-not-exhaustive-either) for the behavioural test that settles it.

### Facet / filter fields

`product-cn-facets` can aggregate **22 fields** marked ✓ below (17 multiple, 2 date, 3 range).

Unlike `yaohai-facets` this tool is **not terms-only** — date and range fields do come back. But read the warning below before using them: they are raw per-value buckets, not calendar intervals, and the 100-bucket cap makes them misleading.

**Date facets are per-value, not per-interval, and the top 100 are not a timeline.** `first_approve_date` returns one bucket per distinct day with `value` as **epoch milliseconds** (divide by 1000, format as UTC); the `*_count` ranges return one bucket per distinct integer, not histogram bins. Sorted by count and capped at 100, the default view is the 100 busiest days — verified live on `product_cn`: 29 of those buckets are 1 January and hold 86% of the reported rows, because older records store **year-only** dates that the backend materializes as `YYYY-01-01`. For any by-year breakdown, run filtered searches over explicit date ranges and read `total` instead. See [result-presentation.md](result-presentation.md#date-and-range-facets-are-per-value-not-per-interval).

The other 1 is **filter-only** — valid in a `query`, but not in the facet catalog, so passing it in `facets` throws `Unknown facet fields` with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `std_dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_type` | | ✓ | 注册分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `national_yibao` | | ✓ | 医保类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `national_jiyao` | | ✓ | 基药类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `state_OTC` | | ✓ | 非处方药 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `listing_date` | | ✓ | 上市年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `new_drug_type` | | ✓ | 新药类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `source` | | ✓ | 国产进口 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `province` | | ✓ | 省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | ✓ | ✓ | ATC分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `special_condition` | | — filter only | 特殊条件 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `approve_date` | | ✓ | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `first_approve_date` | ✓ | ✓ | 首次上市日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `is_orange_book` | | ✓ | 目录集收录 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_passed_yizhi` | | ✓ | 通过一致性评价 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_guojia_jicai` | | ✓ | 是否已国家集采 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `related_jc_projects` | | ✓ | 国家集采相关项目 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `general_name_count` | | ✓ | 同成分厂家数 | range — send `"min to max"` (integers only, literal ` to `) |
| `dosage_count` | | ✓ | 同规格厂家数 | range — send `"min to max"` (integers only, literal ` to `) |
| `product_count` | | ✓ | 同品种厂家数 | range — send `"min to max"` (integers only, literal ` to `) |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

### `view_type` values

`eslist`, `list_by_drug_name`, `list_by_manufacture` — passed as a top-level argument, not inside `query`.

### Examples

**Marketed atorvastatin products**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

**First listed in 2024 — 3,178 rows**

```jsonc
{"query": {"first_approve_date": "2024-01-01 to 2024-12-31"}, "limit": 20}
```

**By manufacturer, exact match — 554 rows. Note `search_mode` goes INSIDE `query`**

```jsonc
{"query": {"manufacture": ["齐鲁制药有限公司"], "search_mode": 2}, "limit": 20}
```

**Oncology drugs already in national procurement**

```jsonc
{"query": {"ATC_code": "L", "is_guojia_jicai": "是"}, "limit": 20}
```

**Products whose same-ingredient competitor count is 20–50**

```jsonc
{"query": {"general_name_count": "20 to 50"}, "limit": 20}
```

**Grouped by manufacturer instead of by approval**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20, "view_type": "list_by_manufacture"}
```

**✗ WRONG — `enterprise` is not a `product_cn` key; silently returns all 243,104 rows**

```jsonc
{"query": {"enterprise": ["齐鲁制药有限公司"]}, "limit": 20}
```

### Facet examples (`yaohai-facets` — not for this database)

`product_cn` uses `product-cn-facets`. The call below is here only to show what happens if you reach for `yaohai-facets` anyway.

**✗ WRONG TOOL — `product_cn` is not in the `yaohai-facets` catalog**

```jsonc
{"dbname": "product_cn", "fields": ["ATC_code"]}
```

*Observed:* Returns `supported: false` with a hint naming `product-cn-facets` (and a `did_you_mean` list for near-miss dbnames). Not an error, so it is easy to miss — read `supported` before using the result.

---

## `ct_global` — 全球临床试验

**Category** 临床试验 · **Route type** `custom` · **Frontend** `/ct/us` · **API path** `/us/ct/eslist` · **Detail** yes

*Catalog keywords:* 全球临床, ClinicalTrials, CT.gov

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 terms) |
| Detail | `yaohai-detail` |

> ClinicalTrials.gov records — English names only. Catalog `search_fields` match the SPA「关键词查询」panel. `item` works (961 rows for atorvastatin). Related-drug key is **`interventions` (plural)**; 申报企业 is **`study_sponsor`**; 登记号 is **`identifier`**. `intervention` / `sponsor` are silently dropped.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | ✓ | 药名/企业/标题/适应症/登记号 |
| `title` | ✓ | 试验名称 |
| `interventions` | | 相关药物 |
| `study_sponsor` | | 申报企业 |
| `identifier` | | 登记号 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /us/ct/eslist/{field}`). `last_updated_date` is defined in the panel file but **not rendered**.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `ct_status` | | ✓ | 招募状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `study_phase` | | ✓ | 临床阶段 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `has_result` | | ✓ | 研究结果 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `study_type` | | ✓ | 研究类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `first_received_date` | | SPA | 登记日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Examples

**Global trials for a drug — 961 rows (English names)**

```jsonc
{"query": {"item": "atorvastatin"}, "limit": 20}
```

**By related drug — `interventions`, not `intervention`**

```jsonc
{"query": {"interventions": "osimertinib"}, "limit": 20}
```

**✗ WRONG — singular `intervention` / `sponsor` are silently dropped**

```jsonc
{"query": {"intervention": "osimertinib"}, "limit": 20}
```

---

## `ct_cn` — 国内临床试验

**Category** 临床试验 · **Route type** `custom` · **Frontend** `/ct/cn` · **API path** `/c/cde/ct/eslist` · **Detail** yes

*Catalog keywords:* 临床, 试验, CDE, CTR

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6 terms) |
| Detail | `yaohai-detail` |

> Trial registrations from both CTR and ChiCTR (see the row's `source`). Catalog `search_fields` match the SPA「关键词查询」panel. `item` matches 药名/企业/适应症/登记号 (title and indication too), so a drug mentioned only in the title is found by `item` but not by `drug_name` — `item=阿托伐` gives 355 rows vs `drug_name=奥希替尼` giving 43. Start with `item` for coverage, narrow with `drug_name` for precision. **`sponsor` is not a key** — use `study_sponsor` for 申报企业.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | ✓ | 药名/企业/适应症/登记号 |
| `PI` | | 研究者姓名 |
| `PI_company` | | 研究者所在单位 |
| `title` | ✓ | 试验名称 |
| `drug_name` | ✓ | 相关药物 |
| `study_sponsor` | | 申报企业 |
| `indication` | | 适应症 |
| `register_num` | | 登记号 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /c/cde/ct/eslist/{field}`).

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `reg_type` | | ✓ | 申报类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ct_status` | | ✓ | 招募状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `study_phase` | | ✓ | 临床阶段 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `study_type` | | ✓ | 试验分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `source` | | ✓ | 数据来源 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `announce_date` | | SPA | 公示日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Examples

**Chinese trials for a drug — 43 rows**

```jsonc
{"query": {"drug_name": "奥希替尼"}, "limit": 20}
```

**Full-text search (matches title/indication too) — 355 rows for 阿托伐**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

**Trials by sponsor — use `study_sponsor`, not `sponsor`**

```jsonc
{"query": {"study_sponsor": "阿斯利康"}, "limit": 20}
```

**✗ WRONG — `sponsor` is not a `ct_cn` key; silently dropped. Use `study_sponsor`.**

```jsonc
{"query": {"sponsor": "阿斯利康"}, "limit": 20}
```

---

## `reg_cn` — 药品注册审评

**Category** 注册情报 · **Route type** `custom` · **Frontend** `/reg/cn` · **API path** `/b/drugreg/cn/eslist` · **Detail** yes

*Catalog keywords:* 注册, 审评, CDE, 受理号, 申报

| MCP tool | |
|---|---|
| Search | `reg-cn-search` |
| Field keys | `reg-cn-fields` |
| Facets | `reg-cn-facets` |
| Detail | `reg-cn-detail` |

> CDE registration & review (pipeline). Use the dedicated `reg-cn-*` tools. Catalog `search_fields` match the SPA「关键词查询」panel: `item`, `drug_name`, `enterprise`, `slh`, `indication`. Default `search_mode` is **1** (相关搜索) and `rows_excluded=1` is injected, so 备案 filings are excluded unless you pass `rows_excluded=0`. Because the default differs from `product_cn`, **set `search_mode` explicitly on both** when comparing marketed vs pipeline counts. Items are **flat**; `detail_url` is disabled — use `reg-cn-detail` with `id`.

### Common search fields (from `*-fields` / SPA keyword panel)

| Key | Verified | Meaning |
|---|---|---|
| `item` | ✓ | 中英药名/企业/适应症/受理号 |
| `drug_name` | ✓ | 中文药名 |
| `enterprise` | | 企业名称 |
| `slh` | | 受理号 |
| `indication` | | 适应症 |
| `rows_excluded` | | 排除备案（默认1；传0才含备案） |
| `search_mode` | | 检索模式（1相关/2完整/3部分，默认1） |

This is **not** an exhaustive key list — `*-fields` returns the keys the search UI exposes, and the ES mapping accepts more. Verified example: `brand_name` is absent from this table yet `{"brand_name": "立普妥"}` returns 62 precise rows. A key missing here is therefore not proof it is invalid; see [query-syntax.md](query-syntax.md#but-the-field-lists-are-not-exhaustive-either) for the behavioural test that settles it.

### Facet / filter fields

`reg-cn-facets` can aggregate **22 fields** marked ✓ below (17 multiple, 2 date, 3 range).

Unlike `yaohai-facets` this tool is **not terms-only** — date and range fields do come back. But read the warning below before using them: they are raw per-value buckets, not calendar intervals, and the 100-bucket cap makes them misleading.

**Date facets are per-value, not per-interval, and the top 100 are not a timeline.** `first_approve_date` returns one bucket per distinct day with `value` as **epoch milliseconds** (divide by 1000, format as UTC); the `*_count` ranges return one bucket per distinct integer, not histogram bins. Sorted by count and capped at 100, the default view is the 100 busiest days — verified live on `product_cn`: 29 of those buckets are 1 January and hold 86% of the reported rows, because older records store **year-only** dates that the backend materializes as `YYYY-01-01`. For any by-year breakdown, run filtered searches over explicit date ranges and read `total` instead. See [result-presentation.md](result-presentation.md#date-and-range-facets-are-per-value-not-per-interval).

The other 1 is **filter-only** — valid in a `query`, but not in the facet catalog, so passing it in `facets` throws `Unknown facet fields` with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `rd_status` | ✓ | ✓ | 研发状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `innovation_degree` | | ✓ | 创新程度 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `first_generic_drug` | | ✓ | 首仿状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_category` | | ✓ | 药品小类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `yibao_dosage` | | ✓ | 医保剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `apply_type` | | ✓ | 申请类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `transact_status` | | ✓ | 办理状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `conclusion` | | ✓ | 审评结论 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `special_list` | | ✓ | 特殊品种 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `applyTypeCde` | | ✓ | 审评序列 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_type` | | ✓ | 注册分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `slh_types` | | ✓ | 申报类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `provinces` | | ✓ | 来源省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | ✓ | ✓ | ATC一级分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `undertake_date` | ✓ | ✓ | 承办日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `status_start_date` | | ✓ | 状态日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `ATC` | | — filter only | ATC分类树 | tree — hierarchical ATC code; the sibling `ATC_code` field takes a bare letter |
| `apply_ctc_num` | | ✓ | 申报临床厂家数 | range — send `"min to max"` (integers only, literal ` to `) |
| `apply_listing_num` | | ✓ | 申报生产厂家数 | range — send `"min to max"` (integers only, literal ` to `) |
| `market_num` | | ✓ | 已上市厂家数 | range — send `"min to max"` (integers only, literal ` to `) |

### `view_type` values

`eslist`, `list_by_drug_name`, `list_by_enterprise` — passed as a top-level argument, not inside `query`.

### Examples

**All CDE submissions for a molecule**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

**In-development antiinfectives — 2,669 rows**

```jsonc
{"query": {"ATC_code": "J", "rd_status": "在研"}, "limit": 20}
```

**Innovative drugs accepted in 2024**

```jsonc
{"query": {"innovation_degree": "创新型", "undertake_date": "2024-01-01 to 2024-12-31"}, "limit": 20}
```

**Submissions on one exact day — 24 rows (bare date = equality)**

```jsonc
{"query": {"undertake_date": "2024-05-01"}, "limit": 30}
```

**Include 备案 filings (default excludes them)**

```jsonc
{"query": {"item": "阿托伐他汀", "rows_excluded": 0}, "limit": 20}
```

**Grouped by applicant company**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20, "view_type": "list_by_enterprise"}
```

---

## `global_search` — 全局搜索

**Category** 综合 · **Route type** `custom` · **Frontend** `/search` · **API path** `/global_drugs/list` · **Detail** yes

*Catalog keywords:* 全球, 综合, 药物全景

| MCP tool | |
|---|---|
| Search | `yaohai-global-search` |
| Field keys | — |
| Facets | SPA 条件筛选 (`dbname`) |
| Detail | `yaohai-detail` |

> **`term` is the only real keyword key.** The backend maps `term` → `drug_name` internally (`make_global_drugs_search_sql`), and `item` is **not** a recognized key here — sending it is silently dropped and returns all 28,282 molecules.

**`brand_name` filters the `indication` column.** This is a backend naming bug (`$indication = $params['brand_name']`). Verified: `{"brand_name": "非小细胞肺癌"}` returns 367 rows of NSCLC-indication drugs. Use it as an indication search; do not expect trade names.

Rows are **molecules**, not products. The `*_drug_num` / `*_ct_num` columns are counts pointing into the other databases — use them to decide where to drill down next. `detail_url` is a working API URL on this database.

### Query keys (from `make_global_drugs_search_sql`, verified live)

| Key | Verified | Behaviour |
|---|---|---|
| `term` | ✓ | 主搜索词 — internally mapped to `drug_name`; LIKE over drug_name / drug_name_en / brand_name |
| `drug_name` | ✓ | 药品名称 — same LIKE behaviour as `term` |
| `exact` | ✓ | `1` = whole-value equality on `drug_name` only (verified: 奥希替尼+exact=1 → 1 row) |
| `target` | ✓ | 靶点 — LIKE |
| `brand_name` | ✓ | ⚠ backend bug: this param filters the **indication** column (LIKE). Verified: 非小细胞肺癌 → 367 rows |
| `brief_introduction` | | 品种简介 — LIKE |
| `drug_type` | | 药品类型 — exact `=` or `string[]` (e.g. 化学药品 / 中药 / 生物制品) |
| `rd_status` | | 研发状态 — exact `=` or `string[]` |
| `year` | | 年份 — exact `=` or `string[]` |
| `ATC_code` | | ATC — `whereIn`; pass a `string[]` of letters |

*Any key not in this table is silently ignored.* In particular `item` is **not** valid here — it returns all 28,282 molecules with HTTP 200.

### Facet / filter fields

SPA「条件筛选」from `globalSearch/components/ConditionSearchPanel.js` is **`dbname` (数据来源)** — a list passed in by the parent, `autoRequestData: false`. `yaohai-facets` does not wrap this route. `drug_type` / `rd_status` / `year` / `ATC_code` are SQL query keys (table above), not rendered condition panels. Drill into a specific market DB for a real 条件筛选 breakdown.

### Examples

**Find a molecule across all markets — 2 rows, both the same ingredient**

```jsonc
{"query": {"term": "osimertinib"}, "limit": 10}
```

**Exact name match only — 1 row**

```jsonc
{"query": {"drug_name": "奥希替尼", "exact": 1}, "limit": 10}
```

**Find drugs by target**

```jsonc
{"query": {"target": "EGFR"}, "limit": 20}
```

**Chemical drugs matching a name fragment**

```jsonc
{"query": {"term": "替尼", "drug_type": "化学药品"}, "limit": 20}
```

**Drugs by indication — note `brand_name` really filters indication**

```jsonc
{"query": {"brand_name": "非小细胞肺癌"}, "limit": 20}
```

**✗ WRONG — `item` is not a key here; silently returns all 28,282 molecules**

```jsonc
{"query": {"item": "osimertinib"}, "limit": 10}
```

---
