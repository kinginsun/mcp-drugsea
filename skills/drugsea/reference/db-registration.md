# Registration & NMPA registers

Chinese registration-side registers: NMPA licences, consistency evaluation, new drugs, 原辅包, and the `drugreg_cn` aggregation engine.

12 databases: `nmpa_gmp`, `nmpa_tcm_protection`, `nmpa_tcm_granules`, `nmpa_guochan`, `nmpa_buchongbeian`, `nmpa_reg_patent`, `nmpa_jinkou`, `drugreg_cn`, `yzpj_products`, `generic_cn`, `china_new_drugs`, `cde_yfb_registration`

---

## `nmpa_gmp` — GMP认证

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_gmp` · **API path** `/nmpa_gmp/eslist` · **Detail** yes

*Catalog keywords:* GMP认证

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> GMP certificates. Certificates, not products — `certification_range` is the key field.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `certification_num` | | 证书编号 |
| `company` | | 企业名称 |
| `certification_range` | | 认证范围 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `std_province` | | ✓ | 省市 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_date_of_issue` | | — filter only | 发证日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `std_gmp_status` | | ✓ | 证书状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_date_of_expiry` | | — filter only | 截止日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `nmpa_tcm_protection` — 中药保护品种

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_tcm_protection` · **API path** `/nmpa_tcm_protection/eslist` · **Detail** NO

*Catalog keywords:* 中药保护品种

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
| `item` | | 保护品种编号/药品名称/生产企业/批准文号 |
| `bhpz_num` | | 保护品种编号 |
| `drug_name` | | 药品名称 |
| `manufacture` | | 生产企业 |
| `specification` | | 规格 |
| `auth_num` | | 批准文号 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 2 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `protect_start` | | — filter only | 保护起始日 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `protect_end` | | — filter only | 保护终止日 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `protect_period` | | ✓ | 保护期限 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `nmpa_tcm_granules` — 中药配方颗粒备案信息

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_tcm_granules` · **API path** `/f/nmpa_tcm_granules/eslist` · **Detail** yes

*Catalog keywords:* 中药配方颗粒备案信息

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 备案号/颗粒名称/生产企业 |
| `filing_num` | | 备案号 |
| `drug_name` | | 中药配方颗粒名称 |
| `manufacture` | | 生产企业 |
| `specification` | | 规格 |
| `package_specification` | | 包装规格 |
| `granule_standard` | | 中药配方颗粒执行标准 |
| `herb_standard` | | 中药饮片执行标准 |
| `sale_to_province` | | 销往省份 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `filing_status` | | ✓ | 备案状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `filing_date` | | — filter only | 备案时间 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `record_province` | | ✓ | 备案省局 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `nmpa_guochan` — 国产药品

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_guochan` · **API path** `/f/nmpa_guochan/eslist` · **Detail** yes

*Catalog keywords:* 国产药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> `item` works (120 rows for 阿托伐). Raw licence register — overlaps `product_cn`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `auth_num` | ✓ | 批准文号 |
| `drug_name` | ✓ | 产品名称 |
| `drug_name_en` | ✓ | 英文名称 |
| `specification` | ✓ | 规格 |
| `manufacture` | ✓ | 生产单位 |

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `approve_date` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 产品类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Domestic approval numbers — 120 rows**

```jsonc
{"query": {"item": "阿托伐"}, "limit": 20}
```

### Facet examples (`yaohai-facets`)

**Break the licence register down by product category**

```jsonc
{"dbname": "nmpa_guochan", "fields": ["drug_type", "in_sfda"]}
```

*Observed:* `drug_type`: 化学药品 141,661 / 中药 64,865 / 生物制品 3,648 / 辅料 140 / 国产包材 8 / 体外诊断试剂 2. `in_sfda`: 是 159,297 / 否 51,114 — so 51k of these licences are no longer valid, which matters for any count you quote.

---

## `nmpa_buchongbeian` — 境内生产药品备案信息公示

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_buchongbeian` · **API path** `/nmpa_buchongbeian/eslist` · **Detail** NO

*Catalog keywords:* 境内生产药品备案信息公示

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | — (no detail) |

> `has_detail: false`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 备案号/药品名称/备案内容/生产企业/批准文号 |
| `record_num` | | 备案号 |
| `record_content` | | 备案内容 |
| `drug_name` | | 药品名称 |
| `manufacture` | | 生产企业 |
| `specification` | | 规格 |
| `auth_num` | | 批准文号 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `dosage_form` | | ✓ | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `record_office` | | ✓ | 备案机关 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `record_date` | | — filter only | 备案日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `nmpa_reg_patent` — 药品注册相关专利信息

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_reg_patent` · **API path** `/f/nmpa_reg_patent/eslist` · **Detail** yes

*Catalog keywords:* 药品注册相关专利信息

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | `yaohai-detail` |

> 药品注册专利 — patent term/linkage data. Pairs with `zldj` and `zlsm`.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 受理号/药名/申请人 |
| `slh` | | 受理号 |
| `drug_name` | | 药品名称 |
| `applicant` | | 申请人 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `patent_type` | | ✓ | 专利类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `expiry_date` | | — filter only | 专利到期日 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `nmpa_jinkou` — 进口药品

**Category** NMPA基础库 · **Route type** `dbs` · **Frontend** `/in/nmpa_jinkou` · **API path** `/f/nmpa_jinkou/eslist` · **Detail** yes

*Catalog keywords:* 进口药品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> NMPA import drug registration certificates (进口药品注册证).

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 注册证号/药名/厂商 |
| `auth_num` | | 注册证号 |
| `drug_name_cn` | | 产品名称（中文） |
| `drug_name_en` | | 产品名称（英文） |
| `specification` | | 规格 |
| `manufacture_cn` | | 生产厂商（中文） |
| `manufacture_en` | | 生产厂商（英文） |
| `company_cn` | | 持证商（中文） |
| `company_en` | | 持证商（英文） |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `date_of_issue` | | — filter only | 批准日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 产品类别 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `in_sfda` | | ✓ | 是否有效 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `drugreg_cn` — 【随心汇】药品注册审评

**Category** 注册情报 · **Route type** `aggs` · **Frontend** `/aggs/drugreg_cn` · **API path** `/drugreg_cn/aggs/list` · **Detail** yes

*Catalog keywords:* 【随心汇, 药品注册审评

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (16 terms) |
| Detail | `yaohai-detail` |

> **Returns aggregates, not rows.** This is the only `aggs`-route database. Items are `{sumBy field(s), count}` groups where `count = count(distinct sumTarget)`, and `total` is the **number of groups**.

Control the grouping with `sumBy` (string or array) and `sumTarget` inside `query`. Defaults are `sumBy=['general_name']`, `sumTarget='slh'`. Values must come from the aggregate-by / aggregate-target lists below or the SQL will fail.

Use this for counting questions ("how many", "which companies"); use `reg_cn` when you need actual submission records. **No detail drill-down** — a group is not a record.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `slh` | | 受理号 |
| `DrugUID` | | DrugUID |
| `XUI` | | XUI |
| `drug_name` | ✓ | 药品名称 |
| `general_name` | | 成分词 |
| `is_yizhipingjia` | | 是否一致评价 |
| `drug_category` | | 药品小类 |

### Condition / filter fields

SPA「条件筛选」from `more/aggs/config/data.js` (`is_condition: true`). `yaohai-facets` fetches the 16 terms fields via `GET /drugreg_cn/aggs/filter/{field}`. Date conditions stay filter-only. Every search already returns grouped counts via `sumBy` / `sumTarget`.

| Key | Verified | Label | Filter type |
|---|---|---|---|
| `is_yizhipingjia` | | 是否一致评价 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_category` | | 药品小类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | 剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `yibao_dosage` | | 医保剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `administration_route` | | 给药途径 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `innovation_degree` | ✓ | 创新程度 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `apply_type` | | 申请类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_type` | | 注册分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `slh_types` | | 申报类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `undertake_date` | | 承办日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `prov_abs` | | 省份简称 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `province` | | 省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `transact_status` | | 办理状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `status_start_date` | | 状态日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `conclusion` | | 审评结论 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `rd_status` | | 研发状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | | 治疗领域 | multiple — exact string or `string[]`, copy the facet value verbatim |

### `sumBy` — valid group-by fields

`slh` (受理号), `DrugUID` (DrugUID), `drug_name` (药品名称), `general_name` (成分词), `is_yizhipingjia` (是否一致评价), `drug_type` (药品类型), `specification` (规格), `drug_category` (药品小类), `dosage_form` (剂型), `yibao_dosage` (医保剂型), `administration_route` (给药途径), `innovation_degree` (创新程度), `apply_type` (申请类型), `register_type` (注册分类), `slh_types` (申报类型), `prov_abs` (省份简称), `enterprise` (申报企业), `transact_status` (办理状态), `conclusion` (审评结论), `rd_status` (研发状态), `ATC_code` (治疗领域)

### `sumTarget` — valid count-target fields

`slh` (受理号), `DrugUID` (DrugUID), `drug_name` (药品名称), `general_name` (成分词), `enterprise` (申报企业)

### Keyword (`is_search`) fields

`slh` (受理号), `DrugUID` (DrugUID), `drug_name` (药品名称), `general_name` (成分词), `specification` (规格), `enterprise` (申报企业)

### Examples

**Which ingredient groups exist for a drug — 12 groups**

```jsonc
{"query": {"drug_name": "阿托伐他汀"}, "limit": 20}
```

**Which companies filed, and how many each — 247 groups**

```jsonc
{"query": {"drug_name": "阿托伐他汀", "sumBy": "enterprise", "sumTarget": "slh"}, "limit": 20}
```

**Filings per province for innovative drugs**

```jsonc
{"query": {"innovation_degree": "创新型", "sumBy": "province", "sumTarget": "slh"}, "limit": 30}
```

**Two-level grouping (province × drug type)**

```jsonc
{"query": {"drug_name": "阿托伐他汀", "sumBy": ["province", "drug_type"], "sumTarget": "slh"}, "limit": 30}
```

---

## `yzpj_products` — 一致性评价产品

**Category** 注册情报 · **Route type** `dbs` · **Frontend** `/in/yzpj_products` · **API path** `/b/yzpj_products/list` · **Detail** NO

*Catalog keywords:* 一致性评价产品

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (1 field) |
| Detail | — (no detail) |

> `has_detail: false`. MySQL engine: prefer plain string keywords.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `first_pass_enterprise` | | 首家过评企业 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `latest_status` | | ✓ | 最高进展 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `first_pass_date` | | — filter only | 首家过评日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Facet examples (`yaohai-facets`)

**Consistency-evaluation progress at a glance — note the non-`/eslist` prefix**

```jsonc
{"dbname": "yzpj_products", "fields": ["latest_status"]}
```

*Observed:* 已通过 1,812 / 审评中 479 / 未通过 167. This database's prefix is `/b/yzpj_products/list`, not `/eslist`, and it works anyway.

---

## `generic_cn` — 一致性评价产品

**Category** 注册情报 · **Route type** `custom` · **Frontend** `/generic/cn` · **API path** `/generic/cn/list` · **Detail** yes

*Catalog keywords:* 仿制药, 一致性评价, 参比制剂

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2) |
| Detail | `yaohai-detail` |

> **Rows are varieties (品种), not individual products** — each carries counts like `yzpj_passed` (已过评), `listing_num` (中国上市), `jicai_num` (国家集采). `has_detail: false`.

**Only `drug_name` works reliably.** `enterprise` is silently dropped (returns all 3,823 varieties), and `manufacture` — although the backend reads it (`make_generic_product_search_sql`) — **throws a SQL error** because the column does not exist:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'manufacture' in 'where clause'
```

To find a company's consistency-evaluation varieties, use `product_cn` with `is_passed_yizhi` / `gj_passed_yizhi` instead.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | ✓ | 药品名称 |
| `enterprise` | ✗ broken | 企业名称 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches `drug_type` / `dosage_form` via `GET /generic/cn/list/{field}` (needs drugsea_api deploy of that route). `ATC_code` is defined in the panel file but **not rendered**.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | ✓ | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Consistency-evaluation varieties — 7 rows (variety-level, not per-product)**

```jsonc
{"query": {"drug_name": "阿托伐他汀"}, "limit": 20}
```

**✗ WRONG — `enterprise` is silently dropped; returns all 3,823 varieties**

```jsonc
{"query": {"enterprise": "齐鲁制药"}, "limit": 20}
```

**✗ BROKEN — `manufacture` is in the backend code but the column does not exist: SQL error 1054**

```jsonc
{"query": {"manufacture": "齐鲁制药"}, "limit": 20}
```

---

## `china_new_drugs` — 中国新药

**Category** 注册情报 · **Route type** `custom` · **Frontend** `/reg/china_new_drugs` · **API path** `/b/new/drug/cn/list` · **Detail** NO

*Catalog keywords:* 新药, 1类, 创新药

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (11 terms) |
| Detail | — (no detail) |

> `has_detail: false`. MySQL engine: prefer plain string keywords. Catalog `search_fields` match the SPA「关键词查询」panel: `drug_name`, `enterprise`, `slh`, `indication`. There is no `item` box. The list SQL currently filters `drug_name` / `enterprise` / `slh`; `indication` is on the page but the helper does not read it (stored columns are `indication_ctr` / `indication_cde`).

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 中英文药品名称 /商品名 |
| `enterprise` | | 企业名称 |
| `slh` | | 受理号 |
| `indication` | | 适应症（页面有框；list SQL 目前未读该键） |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

`yaohai-facets` fetches terms buckets via `GET /b/drugreg/cn/list/{field}` (reg_cn list aggregations, same as the SPA `url`). Date pickers are filter-only.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `rd_status` | | ✓ | 研发状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `apply_type` | | ✓ | 申请类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `conclusion` | | ✓ | 审评结论 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `transact_status` | | ✓ | 办理状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_type` | | ✓ | 注册分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `special_list` | | ✓ | 特殊品种 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `slh_types` | | ✓ | 申报类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `ATC_code` | | ✓ | ATC分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `prov_abs` | | ✓ | 来源省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `undertake_date` | | SPA | 承办日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `status_start_date` | | SPA | 状态日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `cde_yfb_registration` — 原料药、药用辅料和药包材登记信息公示

**Category** 注册情报 · **Route type** `dbs` · **Frontend** `/in/cde_yfb_registration` · **API path** `/c/cde_yfb_registration/eslist` · **Detail** yes

*Catalog keywords:* 原料药, 药用辅料和药包材登记信息公示

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> 原辅包 (API/excipient/packaging) CDE registrations.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `product_name` | | 品种名称 |
| `company` | | 企业名称 |
| `package_specification` | | 包装规格 |
| `specification` | | 规格 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 3 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `reg_num_year` | | ✓ | 批准年份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `local_or_import` | | ✓ | 产品来源 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `marketing_count` | | — filter only | 厂家数量 | range — send `"min to max"` (integers only, literal ` to `) |
| `yfb_type` | | ✓ | 原辅包类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_date` | | — filter only | 登记日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `update_date` | | — filter only | 更新日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---
