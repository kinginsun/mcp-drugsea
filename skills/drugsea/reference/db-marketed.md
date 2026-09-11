# Marketed drugs — international

Approved/licensed product registers outside mainland China. Route here once the question names a specific foreign market.

14 databases: `dpd`, `tw_fda`, `japan_dmf`, `product_jp`, `product_eu`, `hma`, `isaf_drugs`, `isaf_tcm`, `fda_dmf`, `product_us`, `fda_ndc`, `uk_emc`, `hk_doh`, `cmchk_pcm`

---

## `dpd` — 加拿大上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/dpd` · **API path** `/dpd/eslist` · **Detail** yes

*Catalog keywords:* 加拿大上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6 fields) |
| Detail | `yaohai-detail` |

> Canada Drug Product Database.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 药名/成分/厂家 |
| `DIN` | | 药品识别码 |
| `drug_name` | | 药品名称 |
| `company` | | 企业名称 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **6 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `current_status` | | ✓ | 最新状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `route_of_administration` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `class` | | ✓ | 适用对象 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `schedule` | | ✓ | 药品类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ingredient_num` | | — filter only | 成分个数 | range — send `"min to max"` (integers only, literal ` to `) |
| `has_sms` | | ✓ | 是否有说明书 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `tw_fda` — 台湾上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/tw_fda` · **API path** `/tw_fda/eslist` · **Detail** yes

*Catalog keywords:* 台湾上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> Taiwan FDA licences.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 中英文药名/药商/适应症 |
| `Q1ID` | | 药品代码 |
| `drug_name_cn` | | 中文药品 |
| `drug_name_en` | | 英文药品 |
| `sales` | | 药商 |
| `lblLicName` | | 许可证号 |
| `lblIndiCat` | | 适应症 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `mixture` | | ✓ | 单复方 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_clasify_code` | | ✓ | 药品分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `lblLicknd` | | ✓ | 许可证种类 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `japan_dmf` — 日本DMF数据库

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/japan_dmf` · **API path** `/japan_dmf/eslist` · **Detail** NO

*Catalog keywords:* 日本DMF数据库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | — (no detail) |

> `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 注册名称/申请人 |
| `registration_name` | | 注册名称 |
| `applicant_name` | | 申请人 |
| `dmf_code` | | DMF编号 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `registration_type_cn` | | ✓ | 注册类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `latest_registration_date` | | — filter only | 最近注册日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `initial_registration_date` | | — filter only | 初始注册日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `product_jp` — 日本上市药品

**Category** 上市情报 · **Route type** `custom` · **Frontend** `/product/jp` · **API path** `/jp_drugs/eslist` · **Detail** NO

*Catalog keywords:* 日本, PMDA, 日本上市

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (5 fields) |
| Detail | — (no detail) |

> `item` works. `has_detail: false`. `ATC_code` filter takes a single letter; `ATC` takes tree codes.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `company` | ✓ | 企业名称 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /jp_drugs/eslist/{field}`). `ATC` is a tree (`GET /c/get/atc/index2`) and is not in the MCP catalog.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `year` | | ✓ | 上市年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `category_cn` | | ✓ | 产品类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_effect` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | | ✓ | 治疗领域 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `approve_date` | | SPA | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `ATC` | | SPA | ATC分类树 | tree — hierarchical ATC code; the sibling `ATC_code` field takes a bare letter |

### Examples

**Japan PMDA approved drugs — 167 rows**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

---

## `product_eu` — 欧盟EMA上市药品

**Category** 上市情报 · **Route type** `custom` · **Frontend** `/product/eu` · **API path** `/ema_drugs/eslist` · **Detail** yes

*Catalog keywords:* 欧盟, EMA, 欧洲上市

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6 fields) |
| Detail | `yaohai-detail` |

> **Use English names.** `active_substance` / `item` with a Chinese ingredient returns 0 rows; `Osimertinib` returns 1. The catalogue lists `substance` as a search field but the backend reads `active_substance` — `substance` is silently dropped and returns all 2,661 rows.

Real keys (from `make_ema_drugs_search_sql`): `drug_name`, `manufacture`, `brand_name`, `active_substance`, `product_number`, `exact`, `authorisation_date`, `drug_type`, `review_type`, `status`, `condition_approval`, `exceptional_circumstance`, `is_orphan`, `is_generic`, `biosimilar`, `year`, `ATC_code`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `company` | | 企业名称 |
| `substance` | ✗ broken | 活性成分 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /ema_drugs/eslist/{field}`). `review_type` is defined in the panel file but **not rendered**.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `year` | ✓ | ✓ | 上市年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `status` | | ✓ | 审评状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `authorisation_date` | | SPA | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `tags` | | ✓ | 审评标签 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | ✓ | ✓ | ATC分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `therapeutic_area` | | ✓ | 治疗领域 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**EU/EMA medicine by active substance — 1 row. Use the ENGLISH name**

```jsonc
{"query": {"active_substance": "Osimertinib"}, "limit": 20}
```

**Full-text (also works)**

```jsonc
{"query": {"item": "Osimertinib"}, "limit": 20}
```

**Oncology products by ATC letter — 674 rows**

```jsonc
{"query": {"ATC_code": "L"}, "limit": 20}
```

**✗ WRONG — `substance` is not the key (it is `active_substance`); returns all 2,661 rows**

```jsonc
{"query": {"substance": "atorvastatin"}, "limit": 20}
```

---

## `hma` — 欧盟HMA上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/hma` · **API path** `/hma/eslist` · **Detail** yes

*Catalog keywords:* 欧盟HMA上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> EU mutual-recognition / decentralized procedure. `ATC` tree field only.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 药名/成分/企业/MR编号 |
| `MR_number` | | MR MR编号 |
| `product_name` | | 药品名称 |
| `active_substances` | | 活性成分 |
| `MA_holder` | | 上市许可持有人 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 3 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `Ph_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `RMS` | | ✓ | 参考成员国 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `product_outcome` | | ✓ | 市场状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `date_of_outcome` | | — filter only | 获批时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `date_of_update` | | — filter only | 更新时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `ATC` | | — filter only | ATC分类树 | tree — hierarchical ATC code; the sibling `ATC_code` field takes a bare letter |

---

## `isaf_drugs` — 澳门上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/isaf_drugs` · **API path** `/isaf_drugs/eslist` · **Detail** NO

*Catalog keywords:* 澳门上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | — (no detail) |

> **Macau** marketed drugs — the `isaf_` prefix is misleading, it is not international safety data. `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 产品名/制造商/活性成分 |
| `product_name` | | 产品名称 |
| `manufacturer` | | 制造商 |
| `ingredients` | | 活性成分 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ingredients` | | ✓ | 活性成分 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `type` | | ✓ | 法定类别 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `isaf_tcm` — 澳门中成药与天然药物

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/isaf_tcm` · **API path** `/isaf_tcm/eslist` · **Detail** NO

*Catalog keywords:* 澳门中成药与天然药物

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (4 fields) |
| Detail | — (no detail) |

> **Macau** TCM & natural drugs. `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 产品名/制造商 |
| `product_name` | | 产品名称 |
| `manufacturer` | | 制造商 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **4 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `formula` | | ✓ | 配方 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `type` | | ✓ | 法定类别 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `fda_dmf` — 美国DMF数据库

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/fda_dmf` · **API path** `/fda_dmf/eslist` · **Detail** NO

*Catalog keywords:* 美国DMF数据库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | — (no detail) |

> `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 药物名称/持有人 |
| `subject` | | 药物名称 |
| `holder` | | 持有人 |
| `dmf_id` | | DMF编号 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `status` | | ✓ | DMF状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `type` | | ✓ | DMF类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `submit_date` | | — filter only | 提交日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `product_us` — 美国上市药品(含橙皮书)

**Category** 上市情报 · **Route type** `custom` · **Frontend** `/product/us` · **API path** `/fda_drugs/eslist` · **Detail** yes

*Catalog keywords:* 美国, FDA, 橙皮书, ANDA, NDA

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (8 terms) |
| Detail | `yaohai-detail` |

> `item` works (166 rows for 阿托伐). `appl_no` takes the `ANDA207354` / `NDA019089` form. SPA「条件筛选」keys below go in `query`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `appl_no` | ✓ | 申请号 |
| `company` | ✓ | 企业名称 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets (`GET /fda_drugs/eslist/{field}`).

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `ApplyType` | | ✓ | 申请类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `year` | | ✓ | 上市年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ReviewPriorityOrphanStatus` | | ✓ | 评审类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `MarketingStatus` | | ✓ | 市场状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `RLD` | | ✓ | 参比类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `SubmissionClassification` | | ✓ | 化学类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `InnovatorOrGeneric` | | ✓ | 创仿类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `approve_date` | | SPA | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Examples

**US FDA approved products — 166 rows**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

**By application number**

```jsonc
{"query": {"appl_no": "ANDA207354"}, "limit": 20}
```

---

## `fda_ndc` — 美国药品NDC数据库

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/fda_ndc` · **API path** `/fda_ndc/eslist` · **Detail** yes

*Catalog keywords:* 美国药品NDC数据库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (7 fields) |
| Detail | `yaohai-detail` |

> NDC product listing. No ATC field, but `yaohai-facets` does cover it — `PHARM_CLASSES` (药理分类) is the closest thing to a therapeutic breakdown, alongside `DOSAGEFORMNAME`, `ROUTENAME`, `PRODUCTTYPENAME`, `MARKETINGCATEGORYNAME`. Note the keys are the raw openFDA uppercase column names.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `PRODUCTNDC` | | NDC代码 |
| `PROPRIETARYNAME` | | 专利药名/商品名 |
| `NONPROPRIETARYNAME` | | 药品通用名 |
| `SUBSTANCENAME` | | 活性成分 |
| `LABELERNAME` | | 标签持有者 |
| `APPLICATIONNUMBER` | | 注册申请号 |
| `PHARM_CLASSES` | | 药理分类 |
| `DOSAGEFORMNAME` | | 药品剂型 |
| `ACTIVE_NUMERATOR_STRENGTH` | | 规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **7 `terms` fields** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `has_sms` | | ✓ | 是否有说明书 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `MARKETINGCATEGORYNAME` | | ✓ | 市场分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `PRODUCTTYPENAME` | | ✓ | 产品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `DOSAGEFORMNAME` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ROUTENAME` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `NDC_EXCLUDE_FLAG` | | ✓ | NDC排除标记 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `STARTMARKETINGDATE` | | — filter only | 上市日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `ENDMARKETINGDATE` | | — filter only | 退市日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `PHARM_CLASSES` | | ✓ | 药理分类 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `uk_emc` — 英国上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/uk_emc` · **API path** `/uk_emc/eslist` · **Detail** yes

*Catalog keywords:* 英国上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> UK EMC / SmPC documents. `ATC_code` is 治疗领域 (letter); `ATC` takes tree codes.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 全文检索 |
| `active_components` | | 活性成分 |
| `company_name` | | 生产企业 |
| `market_authorization_holder` | | 持证商 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `legal_category` | | ✓ | 法律类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | | ✓ | 治疗领域 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC` | | — filter only | ATC分类树 | tree — hierarchical ATC code; the sibling `ATC_code` field takes a bare letter |
| `first_authorization_date` | | — filter only | 上市日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Facet examples (`yaohai-facets`)

**Confirms the ATC letter-only rule on a third database — and shows a non-WHO letter**

```jsonc
{"dbname": "uk_emc", "fields": ["ATC_code"]}
```

*Observed:* **15** buckets of **bare first-level letters**, summing to 17,183 against a search `total` of 16,077 (the usual multi-valued over-count): N 4,157 / C 2,007 / L 1,901 / A 1,793 / J 1,595 / B 995 / G 849 / R 842 / D 777 / M 707 / S 619 / H 535 / V 321 / P 84 / **X 1**. Copy the letter into an `ATC_code` filter; there is no `C10AA05`-style value to fetch. **`X` is not in WHO ATC and not in `product_cn`'s letter list** — it is this database's 未知 marker (its one row is Mackenzies Smelling Salts, `ATC: R01A; R01; X; R`). Report it as unclassified rather than inventing a meaning. See [atc-therapeutic-classes.md](atc-therapeutic-classes.md#letters-that-exist-in-the-data-but-not-in-the-list).

---

## `hk_doh` — 香港上市药品

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/hk_doh` · **API path** `/hk_doh/eslist` · **Detail** yes

*Catalog keywords:* 香港上市药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> **Hong Kong** marketed drugs (Department of Health). Note `reg_no` expects the `HK-58956` form.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 全文检索 |
| `ingredients` | | 中英文活性成分 |
| `certificate_holder` | | 证书持有人 |
| `product_name` | | 产品名称 |
| `reg_no` | | 注册编号,HK-58956 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `legal_classification` | | ✓ | 法律分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `sale_requirement` | | ✓ | 销售要求 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `registration_date` | | — filter only | 注册日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Examples

**HK marketed drugs by ingredient**

```jsonc
{"query": {"ingredients": "osimertinib"}, "limit": 20}
```

**By registration number**

```jsonc
{"query": {"reg_no": "HK-58956"}, "limit": 10}
```

---

## `cmchk_pcm` — 香港注册中成药

**Category** 上市情报 · **Route type** `dbs` · **Frontend** `/in/cmchk_pcm` · **API path** `/cmchk_pcm/eslist` · **Detail** NO

*Catalog keywords:* 香港注册中成药

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6 fields) |
| Detail | — (no detail) |

> **Hong Kong** registered Chinese patent medicines. `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 产品名/商品名/生产厂家 |
| `product_name_cn` | | 产品名 |
| `trademark_cn` | | 商品名 |
| `manufacture_cn` | | 生产厂家 |
| `dosage_form_cn` | | 剂型 |
| `pack_size_cn` | | 规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **6 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `formula_type` | | ✓ | 注册类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `package_label_cn` | | ✓ | 药材组成 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `pmpw_flag` | | ✓ | PMPW标记 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form_cn` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_export` | | ✓ | 是否出口 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_coexist_cp` | | ✓ | 是否药典收录 | multiple — exact string or `string[]`, copy the facet value verbatim |

---
