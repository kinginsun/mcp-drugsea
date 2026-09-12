# Market access & sales

Insurance, essential-drug lists, procurement, tenders and sales volumes — the commercial-access picture.

12 databases: `jicai_mulu`, `nhsa_herbs`, `yibao`, `nhsa_code`, `nhsa_hospital_prepration`, `jiyao`, `drugsales`, `sales_cn`, `zhaobiao`, `jicai`, `sales_global`, `bio_issue`

---

## `jicai_mulu` — 国家与地方集采目录

**Category** 市场情报 · **Route type** `dbs` · **Frontend** `/in/jicai_mulu` · **API path** `/jicai_mulu/eslist` · **Detail** yes

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> Procurement catalogue/variety list; pairs with `jicai` (the award results). Catalog title is **国家与地方集采目录**; keywords include 集采 / 集采目录 / 品种. `yaohai-catalog` with `q=集采` must list this database.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `jc_product_name` | | 品种名称 |
| `jc_product_specification` | | 规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `jc_type` | | ✓ | 集采类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `jc_project` | | ✓ | 集采项目 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `nhsa_herbs` — 中药饮片信息

**Category** 市场准入 · **Route type** `dbs` · **Frontend** `/in/nhsa_herbs` · **API path** `/c/nhsa_herbs/eslist` · **Detail** yes

*Catalog keywords:* 中药饮片信息

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> TCM decoction pieces covered by insurance.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 饮片代码/名称/功效分类/适应症 |
| `pieces_code` | | 中药饮片代码 |
| `pieces_name` | | 中药饮片名称 |
| `usage` | | 用法用量 |
| `herb_properties` | | 性味归经 |
| `indications` | | 适应症 |
| `standard_source` | | 标准来源 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `efficacy_classification` | | ✓ | 功效分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `region_name` | | ✓ | 地区 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `add_time` | | — filter only | 添加时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `yibao` — 医保目录

**Category** 市场准入 · **Route type** `dbs` · **Frontend** `/in/yibao` · **API path** `/yibao/eslist` · **Detail** yes

*Catalog keywords:* 医保目录

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | `yaohai-detail` |

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 药品名称 |
| `dosage_form` | | 剂型 |
| `class` | | 疾病分类 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `province` | | ✓ | 医保地区 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `insurance_level` | | ✓ | 医保类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_catalog_version` | | ✓ | 医保版本 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Is a drug on the national insurance list**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

### Facet examples (`yaohai-facets`)

**What drug types are on the insurance list?**

```jsonc
{"dbname": "yibao", "fields": ["drug_type"]}
```

*Observed:* 3 buckets summing to 127,717 — 西药 64,476 / 中药 61,340 / 中药饮片 1,901. Complete, because 3 is far below the 100-bucket cap.

**Narrow the distribution to one province — `query` propagates into the aggregation**

```jsonc
{"dbname": "yibao", "fields": ["insurance_level"], "query": {"province": "江西"}}
```

*Observed:* 乙 4,658 / 甲 1,431 = 6,089, versus 125,687 unfiltered. The province filter applied to the buckets, which is what makes facets useful for narrowing.

**⚠ Two fields on the same database sum differently — 2,030 rows have no `insurance_level`**

```jsonc
{"dbname": "yibao", "fields": ["drug_type", "insurance_level"]}
```

*Observed:* `drug_type` sums to 127,717 but `insurance_level` to 125,687. ES `terms` aggregations exclude documents where the field is empty, so the gap is missing data, not a contradiction. Never treat a facet sum as the row count.

**✗ WRONG — `item` is a search key, not a facet field. This THROWS (unlike search)**

```jsonc
{"dbname": "yibao", "fields": ["item"]}
```

*Observed:* `Unknown facet field(s) for yibao: item. Valid fields: province, drug_type, insurance_level, std_catalog_version.` The error hands you the valid list, so a facet call is a cheap way to validate a field name before trusting a search.

---

## `nhsa_code` — 医保药品分类与代码

**Category** 市场准入 · **Route type** `dbs` · **Frontend** `/in/nhsa_code` · **API path** `/c/nhsa_code/eslist` · **Detail** yes

*Catalog keywords:* 医保药品分类与代码

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | `yaohai-detail` |

> NHSA drug codes — the coding layer over `yibao`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `registered_drug_name` | | 注册名称 |
| `enterprise` | | 药品企业 |
| `auth_num` | | 批准文号 |
| `registered_specification` | | 注册规格 |
| `drug_code` | | 药品代码 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `insurance_type` | | ✓ | 医保类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `registered_dosage_form` | | ✓ | 注册剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `min_preparation_unit` | | ✓ | 最小制剂单位 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `min_package_unit` | | ✓ | 最小包装单位 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `nhsa_hospital_prepration` — 医疗机构制剂信息

**Category** 市场准入 · **Route type** `dbs` · **Frontend** `/in/nhsa_hospital_prepration` · **API path** `/c/nhsa_hospital_prepration/eslist` · **Detail** yes

*Catalog keywords:* 医疗机构制剂信息

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> Hospital-preparation (医疗机构制剂) insurance entries.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 受理号/药名/申请人 |
| `preparation_code` | | 制剂代码 |
| `preparation_name` | | 制剂名称 |
| `hospital_name` | | 医疗机构名称 |
| `auth_num` | | 批准文号 |
| `indication` | | 适应症 |
| `usage` | | 用法用量 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `preparation_type` | | ✓ | 制剂类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `region` | | ✓ | 地区 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `expiry_date` | | — filter only | 有效期至 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `add_time` | | — filter only | 添加时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `jiyao` — 基药目录

**Category** 市场准入 · **Route type** `dbs` · **Frontend** `/in/jiyao` · **API path** `/jiyao/eslist` · **Detail** yes

*Catalog keywords:* 基药目录

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | `yaohai-detail` |

> `item` works. 基药 = national essential-drug list.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `specification` | ✓ | 规格 |
| `class` | ✓ | 疾病分类 |

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `province` | | ✓ | 地区 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_catalog_version` | | ✓ | 基药版本 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Essential drug list entries — 34 rows**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

**By drug name and class**

```jsonc
{"query": {"drug_name": "阿托伐他汀"}, "limit": 20}
```

---

## `drugsales` — 全终端药品销售

**Category** 市场情报 · **Route type** `dbs` · **Frontend** `/in/drugsales` · **API path** `/drugsales/eslist` · **Detail** NO

*Catalog keywords:* 全终端药品销售

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (7 fields) |
| Detail | — (no detail) |

> **VIP-only (`groupid=205`)** and slow without filters. Always pass `year` plus a drug or company key. `has_detail: false`. `yaohai-facets` **injects `groupid=205` automatically** for this database (it is the only entry with a `defaultQuery`), so a facet call works without you setting it — your own `query` value still overrides it.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 药名/企业 |
| `drug_name` | | 成分词 |
| `brand_name` | | 商品名 |
| `manufacture` | | 生产企业 |
| `dosage_form` | | 剂型 |
| `strength` | | 规格 |
| `group_name` | | 集团名 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **7 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `region` | | ✓ | 区域 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `country` | | ✓ | 国家 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `year` | | ✓ | 年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `sales_channel` | | ✓ | 销售渠道 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |

*`yaohai-facets` injects `groupid=205` into every call for this database (visible in `query_applied`); your own `query` values override it.*

### Facet examples (`yaohai-facets`)

**The only database with an auto-injected query (`groupid=205`)**

```jsonc
{"dbname": "drugsales", "fields": ["drug_type"]}
```

*Observed:* Succeeds without you setting the VIP gate: `query_applied` comes back as `{"groupid": "205"}`. Buckets: 化学药品 943,617 / 中药 290,087 / 生物制品 67,546 / 辅料 993 / 其他 121 / 包材 8. Your own `groupid` overrides the default.

---

## `sales_cn` — 国内医院药品销售

**Category** 市场情报 · **Route type** `custom` · **Frontend** `/sales/cn` · **API path** `/c/drug/hosp` · **Detail** NO

*Catalog keywords:* 销售, 医院, 市场份额

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6, static lists) |
| Detail | — (no detail) |

> **Variety-level, not transaction-level**, and `has_detail: false`. Catalog `search_fields` match the SPA「关键词查询」panel. **`item` and `product` are not keys** — they are silently dropped (full-DB `total`). ATC facet renders as `letter:中文`; send the bare letter. Checkbox「精确查询」is `exact: 1` (not a keyword box).

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 成分词(不含酸根、盐和剂型) |
| `xd_drug_name` | | 通用名(含酸根、盐和剂型) |
| `company` | ✓ | 企业名称 |
| `xd_company` | | 持证商(XD) |
| `dosage_form` | | 剂型 |
| `xd_dosage_form` | | 剂型(XD) |
| `specification` | | 规格 |
| `xd_specification` | | 规格(XD) |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` returns the hardcoded SPA lists (`count` is null). `ATC_code` values are `letter:中文`.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `years` | | SPA list | 销售年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `quarter` | | SPA list | 销售季度 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | SPA list | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | SPA list | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | | SPA list | 治疗分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `city` | | SPA list | 市场区域 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Hospital sales for a drug — 2 rows (variety-level)**

```jsonc
{"query": {"drug_name": "阿托伐他汀"}, "limit": 20}
```

**By company — 5 rows**

```jsonc
{"query": {"company": "齐鲁"}, "limit": 20}
```

**Exact match (SPA「精确查询」)**

```jsonc
{"query": {"drug_name": "阿托伐他汀", "exact": 1}, "limit": 20}
```

**✗ WRONG — `item` / `product` are not `sales_cn` keys; silently returns all 8,835,947 rows**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

---

## `zhaobiao` — 国内药品中标

**Category** 市场情报 · **Route type** `custom` · **Frontend** `/zhaobiao` · **API path** `/es/zhaobiao/list` · **Detail** yes

*Catalog keywords:* 招标, 中标, 挂网

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (7) |
| Detail | `yaohai-detail` |

> Tender/award (挂网价). **Elasticsearch** on `view_zhaobiao` via `/es/zhaobiao/list` — same `make_es_condtions()` grammar as other ES databases. Do not treat the `/list` suffix as MySQL; the leftover MySQL path `/zhaobiao/list` is not what MCP or the SPA use.
>
> Catalog `search_fields` match the SPA「关键词查询」panel: `item`, `category`, `drug_name`, `manufacture`, `auth_num`, `dosage_form`, `specification`, `quality_level`, `switch`, `bid_price`. Prefer `manufacture` for 企业名称; MCP aliases `company` → `manufacture`. `province` is a facet filter, not a keyword box.

Unfiltered size (2026-09-11): **4,598,529**.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | ✓ | 全文搜索；`阿托伐他汀` → 9,336（与 `drug_name` 同量） |
| `category` | ✓ | 招标项目名称（`河北` → 102,236） |
| `drug_name` | ✓ | 药品名称 |
| `manufacture` | ✓ | 企业名称（`齐鲁` → 38,832） |
| `auth_num` | ✓ | 批准文号（`国药准字H20051408` → 142） |
| `dosage_form` | | 剂型 |
| `specification` | | 规格 |
| `quality_level` | | 质量层次 |
| `switch` | | 转换比 |
| `bid_price` | | 中标价 |

### Examples

**By ingredient (use `item` or `drug_name`)**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

**By manufacturer — not `company`**

```jsonc
{"query": {"manufacture": "齐鲁"}, "limit": 20}
```

**Alias.** MCP rewrites `company` → `manufacture`. Prefer `manufacture`.

```jsonc
{"query": {"company": "齐鲁"}, "limit": 20}
```

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /es/zhaobiao/list/{field}`).

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `bid_type` | ✓ | ✓ | 中标类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `province` | ✓ | ✓ | 中标省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `notice_year` | ✓ | ✓ | 中标年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `execute_status` | | ✓ | 执行状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `unit` | | ✓ | 最小包装单位 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `min_unit` | | ✓ | 最小制剂单位 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `category` | | ✓ | 中标项目 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `jicai` — 国家与地方集采数据库

**Category** 市场情报 · **Route type** `dbs` · **Frontend** `/in/jicai` · **API path** `/jicai/eslist` · **Detail** yes

*Catalog keywords:* 国家与地方集采数据库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | `yaohai-detail` |

> `item` works. These are the **award results**; `jicai_mulu` is the catalogue/variety list.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `manufacture` | ✓ | 生产企业 |
| `specification` | ✓ | 规格 |
| `auth_num` | ✓ | 批准文号 |

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `jc_type` | | ✓ | 集采类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `jc_project` | | ✓ | 集采项目 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `region` | | ✓ | 中选区域 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `execution_status` | | ✓ | 执行状态 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**National centralized procurement winners — 1,098 rows**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

**By approval number**

```jsonc
{"query": {"auth_num": "国药准字H20051408"}, "limit": 20}
```

### Facet examples (`yaohai-facets`)

**Which procurement types exist?**

```jsonc
{"dbname": "jicai", "fields": ["jc_type"]}
```

*Observed:* 3 buckets summing to 892,528 — 联盟集采 838,695 / 国家集采 35,397 / 省市集采 18,436.

**⚠ Exactly 100 buckets means TRUNCATED — raise `maxSize` before summing**

```jsonc
{"dbname": "jicai", "fields": ["jc_project"], "query": {"maxSize": 500}}
```

*Observed:* Default returns 100 buckets summing to 891,595. With `maxSize: 500` you get **128** buckets summing to 892,528 — the field really has 128 values and the default silently hid 28 of them. `maxSize` is a bucket cap, not a filter.

---

## `sales_global` — 年报药品销售

**Category** 市场情报 · **Route type** `custom` · **Frontend** `/sales/global` · **API path** `/drug/annual_report` · **Detail** NO

*Catalog keywords:* 年报, 全球销售

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2, static lists) |
| Detail | — (no detail) |

> `has_detail: false` — the list row is all you get.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `company` | | 企业名称 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` returns the hardcoded SPA lists (`count` is null): `source` is 中国 / 全球; `years` is 2005–2019.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `source` | | SPA list | 市场 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `years` | | SPA list | 年份 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `bio_issue` — 生物制品批签发

**Category** 市场情报 · **Route type** `custom` · **Frontend** `/bio/issue` · **API path** `/c/pqf/eslist` · **Detail** yes

*Catalog keywords:* 批签发, 生物制品, 疫苗

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 terms) |
| Detail | `yaohai-detail` |

> Biologics batch release (批签发), the vaccine/blood-product volume signal.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `product_name` | | 产品名称 |
| `manufacture` | | 生产企业 |
| `batch_no` | | 批号 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /c/pqf/eslist/{field}`).

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `issue_date` | | SPA | 签发时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `issue_conclusion` | | ✓ | 签发结论 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `source` | | ✓ | 来源 | multiple — exact string or `string[]`, copy the facet value verbatim |

---
