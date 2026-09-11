# Devices, health food & policy catalogues

Medical devices, health foods, the China Orange Book, reference-listed drugs and government catalogues.

10 databases: `nmpa_tsspxx_gc`, `medical_device_beian`, `medical_device`, `nmpa_tsspxx_jk`, `medical_device_jinkou_beian`, `medical_device_jinkou`, `cn_orange_book`, `cn_reference_drugs`, `cn_reference_drugs_publicity`, `gov_drugs`

---

## `nmpa_tsspxx_gc` — 国产保健食品注册

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_tsspxx_gc` · **API path** `/f/nmpa_tsspxx_gc/eslist` · **Detail** yes

*Catalog keywords:* 国产保健食品注册

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | `yaohai-detail` |

> Domestic health-food (保健食品) approvals — 国食健字, not 国药准字.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `auth_num` | | 批准文号 |
| `product_name` | | 产品名称 |
| `applicant_cn` | | 申请人中文名称 |
| `specification` | | 产品规格 |
| `main_ingrediant` | | 主要原料 |
| `people_suitable` | | 适宜人群 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `approval_date` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `medical_device_beian` — 国产器械(备案)

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/medical_device_beian` · **API path** `/medical_device_beian/eslist` · **Detail** yes

*Catalog keywords:* 国产器械, 备案)

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | SPA 条件筛选 (1 date) |
| Detail | `yaohai-detail` |

> Domestic Class I device filings (备案, not 注册).

### Search fields

| Key | Verified | Label |
|---|---|---|
| `filing_person` | | 备案人名称 |
| `product_name` | | 产品名称 |
| `filing_num` | | 备案号 |
| `filing_department` | | 备案单位 |
| `product_description` | | 产品描述 |
| `expected_usage` | | 预期用途 |
| `specification` | | 型号规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

SPA「条件筛选」from the shared DBS `ConditionSearchPanel.js` key `medical_device_beian`. The rendered field is `filing_date` (备案日期, date picker). `yaohai-facets` is terms-only so it will not list this dbname. The panel `url` currently points at `/medical_device_jinkou_beian/eslist/approval_date` (a frontend swap). Send `filing_date` in `query` as a date range.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `filing_date` | | SPA | 备案日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `medical_device` — 国产器械(注册)

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/medical_device` · **API path** `/medical_device/eslist` · **Detail** yes

*Catalog keywords:* 国产器械, 注册)

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | `yaohai-detail` |

> Domestic device registration certificates. Not drugs — route device questions here, not to `product_cn`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `registrant_name` | | 注册人名称 |
| `product_name` | | 产品名称 |
| `certification_num` | | 注册证编号 |
| `agent_name` | | 代理人名称 |
| `approval_department` | | 审批部门 |
| `structure_composition` | | 结构及组成 |
| `specification` | | 型号、规格 |
| `application_scope` | | 适用范围/预期用途 |
| `storage_conditions_and_period` | | 产品储存条件及有效期 |
| `remarks` | | 备注 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `std_product_type` | | ✓ | 管理类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `approval_date` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `valid_until_date` | | — filter only | 有效期至 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `nmpa_tsspxx_jk` — 进口保健食品注册

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_tsspxx_jk` · **API path** `/f/nmpa_tsspxx_jk/eslist` · **Detail** yes

*Catalog keywords:* 进口保健食品注册

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | `yaohai-detail` |

> Imported health-food approvals.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `auth_num` | | 批准文号 |
| `product_name` | | 产品名称 |
| `applicant_cn` | | 中英文申请人 |
| `manufacture_cn` | | 中英文生产企业 |
| `specification` | | 产品规格 |
| `main_ingrediant` | | 主要原料 |
| `people_suitable` | | 适宜人群 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `approval_date` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `medical_device_jinkou_beian` — 进口器械(备案)

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/medical_device_jinkou_beian` · **API path** `/medical_device_jinkou_beian/eslist` · **Detail** yes

*Catalog keywords:* 进口器械, 备案)

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | SPA 条件筛选 (1 date) |
| Detail | `yaohai-detail` |

> Imported Class I device filings.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `filing_person` | | 备案人名称 |
| `agent_name` | | 代理人名称 |
| `product_name` | | 产品名称 |
| `filing_num` | | 备案号 |
| `filing_department` | | 备案单位 |
| `product_description` | | 产品描述 |
| `specification` | | 型号规格 |
| `expected_usage` | | 预期用途 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

SPA「条件筛选」from the shared DBS `ConditionSearchPanel.js` key `medical_device_jinkou_beian`. The rendered field is `filing_date` (备案日期, date picker). `yaohai-facets` is terms-only so it will not list this dbname. The panel `url` currently points at `/medical_device_beian/eslist/approval_date` (a frontend swap). Send `filing_date` in `query` as a date range.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `filing_date` | | SPA | 备案日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `medical_device_jinkou` — 进口器械(注册)

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/medical_device_jinkou` · **API path** `/medical_device_jinkou/eslist` · **Detail** yes

*Catalog keywords:* 进口器械, 注册)

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | `yaohai-detail` |

> Imported device registration certificates.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `registrant_name` | | 注册人名称 |
| `product_name` | | 产品名称 |
| `certification_num` | | 注册证编号 |
| `agent_name` | | 代理人名称 |
| `approval_department` | | 审批部门 |
| `main_components` | | 主要组成成分 |
| `application_scope` | | 适用范围 |
| `specification` | | 型号、规格 |
| `remarks` | | 备注 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `std_product_type` | | ✓ | 管理类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `approval_date` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `valid_until_date` | | — filter only | 有效期至 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `cn_orange_book` — 中国上市化学药品目录集

**Category** 药政参考 · **Route type** `dbs` · **Frontend** `/in/cn_orange_book` · **API path** `/c/cn_orange_book/eslist` · **Detail** yes

*Catalog keywords:* 中国上市化学药品目录集

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (6 fields) |
| Detail | `yaohai-detail` |

> China Orange Book (目录集) — the reference-listing catalogue. Pairs with `cn_reference_drugs`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 中英药品/商品名/企业 |
| `drug_name` | | 药品名称 |
| `brand_name` | | 商品名 |
| `license_holder` | | 持证商 |
| `auth_num` | | 批准文号 |
| `specification` | | 规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **6 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | ✓ | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_reference_drug` | | ✓ | 参比制剂 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_standard_drug` | | ✓ | 标准制剂 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `category` | | ✓ | 收录类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `marketing_status` | | ✓ | 上市销售状态 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Facet examples (`yaohai-facets`)

**How many entries are reference-listed drugs? Note the junk buckets**

```jsonc
{"dbname": "cn_orange_book", "fields": ["is_reference_drug"]}
```

*Observed:* 否 16,269 / 是 960 / **`/` 9** / **`空` 3**. The placeholder buckets are real data, so a boolean-looking field has four values here — mention or exclude them rather than silently folding them into 否.

---

## `cn_reference_drugs` — 仿制药参比制剂目录

**Category** 药政参考 · **Route type** `dbs` · **Frontend** `/in/cn_reference_drugs` · **API path** `/c/cn_reference_drugs/eslist` · **Detail** yes

*Catalog keywords:* 仿制药参比制剂目录

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> 参比制剂 — reference-listed drugs for generic development. Pairs with `cn_reference_drugs_publicity`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 中英文药品/商品名 |
| `license_holder` | | 持证商 |
| `specification` | | 规格 |
| `ref_id` | | 参比制剂编号 |
| `note1` | | 备注1 |
| `note2` | | 备注2 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `batch_no` | | ✓ | 公布批次 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `notice_date` | | — filter only | 公告时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `cn_reference_drugs_publicity` — 仿制药参比制剂目录(征求意见稿)

**Category** 药政参考 · **Route type** `dbs` · **Frontend** `/in/cn_reference_drugs_publicity` · **API path** `/c/cn_reference_drugs_publicity/eslist` · **Detail** yes

*Catalog keywords:* 仿制药参比制剂目录, 征求意见稿)

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 中英文药品/商品名 |
| `license_holder` | | 持证商 |
| `specification` | | 规格 |
| `ref_id` | | 参比制剂编号 |
| `note1` | | 备注1 |
| `note2` | | 备注2 |
| `screening_note` | | 遴选情况说明 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `publicity_type` | | ✓ | 公示类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `batch_no` | | ✓ | 公布批次 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `notice_date` | | — filter only | 公告时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `gov_drugs` — 政府用药目录

**Category** 药政参考 · **Route type** `dbs` · **Frontend** `/in/gov_drugs` · **API path** `/c/gov_drugs/eslist` · **Detail** yes

*Catalog keywords:* 政府用药目录

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> Government-published drug catalogues. Source labels vary by issuing body.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `dosage_form` | | 剂型 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `province` | | ✓ | 省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |

---
