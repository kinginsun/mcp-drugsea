# Reference data & news

Companies, package inserts, targets, TCM, patents, news, announcements and regulations — supporting reference material.

10 databases: `zb_news`, `se_notice`, `drug_law`, `cn_company`, `herb_formulas`, `herbs`, `zldj`, `zlsm`, `shuomingshu`, `targets`

News / announcement DBs (`zb_news`, `se_notice`, `drug_law`) often include file
attachments on `yaohai-detail`. When `dp2_attachments_path` is present, prefer
`https://db.drugsea.cn/api/oss/{dp2_attachments_path}` over `original_source_url`
— see **Attachments** in [SKILL.md](../SKILL.md#gotchas).

---

## `zb_news` — 全国招标动态

**Category** 药闻速递 · **Route type** `dbs` · **Frontend** `/in/zb_news` · **API path** `/c/zb_news/eslist` · **Detail** yes

*Catalog keywords:* 全国招标动态

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> News/articles, not structured records. Keywords are free text, but `city` (省份) and `website` are facetable — use them to break a keyword search down by region or source.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 全文检索 |
| `trace_title` | | 新闻标题 |
| `tags` | | 标签 |
| `dp2_id` | | DP2ID |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `city` | | ✓ | 省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `website` | | ✓ | 网站 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `publish_date` | | — filter only | 发布日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `se_notice` — 医药上市公司公告

**Category** 药闻速递 · **Route type** `dbs` · **Frontend** `/in/se_notice` · **API path** `/h/se_notice/eslist` · **Detail** yes

*Catalog keywords:* 医药上市公司公告

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (2 fields) |
| Detail | `yaohai-detail` |

> Listed-company announcements. Free-text titles. The date filter is a UI picker and is **not** facetable; `se` (公告来源) and `is_transferred_to_references` are.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 全文检索 |
| `stock_name` | | 股票名称/代码 |
| `title` | | 标题 |
| `tags` | | 标签 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `se` | | ✓ | 公告来源 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_transferred_to_references` | | ✓ | 文献标记 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `drug_law` — 药品法规知识库

**Category** 药闻速递 · **Route type** `dbs` · **Frontend** `/in/drug_law` · **API path** `/h/drug_law/eslist` · **Detail** yes

*Catalog keywords:* 药品法规知识库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> Regulations/policy documents. Free text. The date filter is **not** facetable; use `source` (法规来源), `main_category` (一级分类) or `category` (公告栏目) to break results down.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `item` | | 全文检索 |
| `title` | | 法规标题 |
| `tags` | | 标签 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
The other 1 are **filter-only** — valid in a `query`, but passing one in `fields` throws `Unknown facet field(s)` along with the valid list. That differs from search, where an unknown key is silently dropped and you get the whole database back.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `source` | | ✓ | 法规来源 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `main_category` | | ✓ | 一级分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `category` | | ✓ | 公告栏目 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `publish_date` | | — filter only | 发布日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

---

## `cn_company` — 中国医药企业

**Category** 行业参考 · **Route type** `custom` · **Frontend** `/enterprise` · **API path** `/enterprise/eslist` · **Detail** yes

*Catalog keywords:* 企业, 药企, 厂家

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | — (no facet tool) |
| Detail | `yaohai-detail` |

> `item` works (7 rows for 齐鲁). Company-level, not product-level.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `company` | ✓ | 企业名称 |
| `province` | ✓ | 省份 |

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

**No MCP facet tool covers this database.** The fields below still work as `query` filters — the web UI renders them and the backend honours them — but you cannot ask MCP for the value distributions. To approximate a breakdown, run several searches with different filter values and compare `total`.

*Why:* `custom`-route database. `yaohai-facets` v0.4.0 scoped its catalog to `dbs` routes only, so this was never a candidate. The backend aggregation endpoint does exist (`GET /enterprise/eslist/{filter}`) and covers the 2 `terms` fields below — a later MCP release could expose it, but today no MCP tool reaches it.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `province` | ✓ | n/a | 所在省份 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `std_classification` | | n/a | 分类码 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `date_of_issue` | | n/a | 发证日期 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |
| `date_of_expiry` | | n/a | 有效期至 | date — send `"YYYY-MM-DD to YYYY-MM-DD"`; a bare `"YYYY-MM-DD"` means that exact day |

### Examples

**Chinese pharma companies — 7 rows for 齐鲁**

```jsonc
{"query": {"item": "齐鲁"}, "limit": 20}
```

**Companies by province**

```jsonc
{"query": {"province": "山东省"}, "limit": 20}
```

---

## `herb_formulas` — 中药方剂数据库

**Category** 行业参考 · **Route type** `dbs` · **Frontend** `/in/herb_formulas` · **API path** `/herb_formulas/eslist` · **Detail** NO

*Catalog keywords:* 中药方剂数据库

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
| `item` | | 方剂名/组成/主治 |
| `name` | | 方剂名 |
| `formula_source` | | 出处 |
| `component_herbs` | | 处方组成 |
| `effects` | | 功效 |
| `main_indications` | | 主治 |
| `preparation_method` | | 制备方法 |
| `usage` | | 用法用量 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **1 `terms` field** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `herbs` | | ✓ | 组成药材 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `herbs` — 中药材数据库

**Category** 行业参考 · **Route type** `dbs` · **Frontend** `/in/herbs` · **API path** `/herbs/eslist` · **Detail** NO

*Catalog keywords:* 中药材数据库

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
| `item` | | 药材名/适应症 |
| `herb_name` | | 药材名 |
| `herbal_origin` | | 药材基源 |
| `efficacy` | | 功效 |
| `provenance` | | 出处 |
| `dosage` | | 用法用量 |
| `indications` | | 主治 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **2 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `efficacy_class` | | ✓ | 功效分类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `family_classification` | | ✓ | 科属分类 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Facet examples (`yaohai-facets`)

**⚠ Truncation can hide a large share of the data**

```jsonc
{"dbname": "herbs", "fields": ["efficacy_class"], "query": {"maxSize": 1000}}
```

*Observed:* Default: 100 buckets summing to 11,899. With `maxSize: 1000`: **1,000** buckets summing to 14,301 — the default view hides 2,402 rows (17%). Top value is 清热解毒药 1,398, and buckets are always sorted by count descending.

---

## `zldj` — 药品专利信息公示

**Category** 行业参考 · **Route type** `dbs` · **Frontend** `/in/zldj` · **API path** `/c/zldj/eslist` · **Detail** yes

*Catalog keywords:* 药品专利信息公示

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (5 fields) |
| Detail | `yaohai-detail` |

> 专利登记 — patent registrations for chemical drugs.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `specification` | | 规格 |
| `auth_num` | | 批准文号 |
| `drug_holder` | | 持有人名称 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **5 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `registration_status` | | ✓ | 登记状态 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `form_type` | | ✓ | 登记表类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `is_public` | | ✓ | 专利信息公开 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `zlsm` — 药品专利声明

**Category** 行业参考 · **Route type** `dbs` · **Frontend** `/in/zlsm` · **API path** `/c/zlsm/eslist` · **Detail** yes

*Catalog keywords:* 药品专利声明

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> 专利声明 — patent declarations under the linkage system.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `slh` | | 受理号 |
| `specification` | | 规格 |
| `manufacture` | | 仿制药厂家 |
| `auth_num` | | 原研批准文号 |
| `drug_holder` | | 持有人名称 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `drug_type` | | ✓ | 药品类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `dosage_form` | | ✓ | 药品剂型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `register_type` | | ✓ | 注册分类 | multiple — exact string or `string[]`, copy the facet value verbatim |

---

## `shuomingshu` — 药品说明书

**Category** 行业参考 · **Route type** `custom` · **Frontend** `/sms` · **API path** `/sms/eslist` · **Detail** yes

*Catalog keywords:* 说明书, SmPC, PI

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | — (no facet tool) |
| Detail | `yaohai-detail` |

> Package inserts (说明书). Long free-text fields; keyword search works well.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `drug_name` | | 药品名称 |
| `company` | | 企业名称 |
| `item` | | 全文检索 |

*None of these keys were exercised live — the list is read from the catalog. Confirm a key works by checking that `total` drops (see [query-syntax.md](query-syntax.md#the-real-silent-failure-unknown-field-keys)).*

### Facet / filter fields

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

**No MCP facet tool covers this database.** The fields below still work as `query` filters — the web UI renders them and the backend honours them — but you cannot ask MCP for the value distributions. To approximate a breakdown, run several searches with different filter values and compare `total`.

*Why:* `custom`-route database. `yaohai-facets` v0.4.0 scoped its catalog to `dbs` routes only, so this was never a candidate. The backend aggregation endpoint does exist (`GET /sms/eslist/{filter}`) and covers the 3 `terms` fields below — a later MCP release could expose it, but today no MCP tool reaches it.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `source` | | n/a | 批准国家 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `has_sms` | | n/a | 全文附件 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `has_package_pics` | | n/a | 包装图片 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Package insert lookup**

```jsonc
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

---

## `targets` — 药物靶点数据库

**Category** 行业参考 · **Route type** `dbs` · **Frontend** `/in/targets` · **API path** `/targets/eslist` · **Detail** yes

*Catalog keywords:* 药物靶点数据库

| MCP tool | |
|---|---|
| Search | `yaohai-search` |
| Field keys | — |
| Facets | `yaohai-facets` (3 fields) |
| Detail | `yaohai-detail` |

> `item` works (6 rows for EGFR). Also `target_name`, `gene_name`, `abbr_target_name`. Drug-target reference data — useful for mechanism-of-action questions.

### Search fields

| Key | Verified | Label |
|---|---|---|
| `target_name` | ✓ | 靶点名称 |
| `drug_name` | ✓ | 药品名称 |
| `gene_name` | ✓ | 基因名 |
| `abbr_target_name` | ✓ | 靶点简称，NULL检索空白的 |

### Facet / filter fields

`yaohai-facets` can aggregate the **3 `terms` fields** marked ✓ below.
Every field here is facetable. Note that `yaohai-facets` **throws** on an unknown field name (unlike search, which silently drops it and returns everything), so a typo surfaces immediately rather than as a plausible-looking full result set.

`filter_type` is the frontend rendering hint; it tells you which value grammar to send back. ✓ = exercised live, blank = inferred from the frontend panel config.

| Key | Verified | Facetable | Label | Filter type |
|---|---|---|---|---|
| `target_type` | | ✓ | 靶点类型 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `kind` | | ✓ | 种类 | multiple — exact string or `string[]`, copy the facet value verbatim |
| `organism` | | ✓ | 生物体 | multiple — exact string or `string[]`, copy the facet value verbatim |

### Examples

**Drugs acting on a target — 6 rows for EGFR**

```jsonc
{"query": {"item": "EGFR"}, "limit": 20}
```

**By target name**

```jsonc
{"query": {"target_name": "EGFR"}, "limit": 20}
```

### Facet examples (`yaohai-facets`)

**What target types are represented?**

```jsonc
{"dbname": "targets", "fields": ["target_type"]}
```

*Observed:* 4 buckets — target 4,801 / enzyme 267 / transporter 207 / carrier 47.

---
