# Presenting search results

The rules here exist because DrugSea queries routinely return thousands of rows and the
tool caps how many you can fetch. Dumping raw JSON is never the right answer.

## The `total > 20` rule

Read `total` first, then decide the shape of your answer:

| `total` | What to do |
|---|---|
| **0** | Say so plainly, then diagnose — wrong key, wrong value, wrong database, or a date/filter that is too narrow. Offer the most likely fix. Do not silently widen the query. |
| **1–5** | Show every row. A compact table of the fields that answer the question. |
| **6–20** | Show all of them, but pick 4–7 columns that matter. Never show all 50 fields. |
| **21–100** | Show 5–10 representative rows **plus the breakdown**. Lead with a facets call or a `sumBy` grouping so the user sees the shape of the whole set, not a sample. |
| **> 100** | **Do not page through it.** Summarize with counts and a breakdown, show 5–10 examples, and state the full `total` explicitly. Offer to narrow. |

The hard reason for the last row: `limit` caps at 100 (`product-cn-*`, `reg-cn-*`) or 50
(`yaohai-search`, `yaohai-global-search`). A `total` of 243,104 can never be enumerated.
Paging is for reading the *first few pages* of a manageable result set, not for exhausting
a large one.

## Always state the total

Every answer that reports search results must include the exact `total` and what was
searched. Without it the user cannot tell whether you found everything or hit a cap.

> 中国上市药品数据库中找到 **12** 条奥希替尼相关记录（`product_cn`，`item=奥希替尼`）。

Not:

> 找到了一些奥希替尼的记录。

## Quote counts from `total`, never from facet buckets

Facet counts are cached aggregations and **do not sum to `total`** — Elasticsearch `terms`
aggregations skip documents where the field is empty. Measured on `reg_cn`
(`drug_name=奥希替尼`): `total` was **100**, but the `rd_status` buckets summed to **90**,
and one bucket read 59 while the equivalent filtered search returned **69**.

So: use facets to *discover* which values exist, then confirm any number you put in prose
with a filtered search and cite its `total`. See
[query-syntax.md](query-syntax.md#facet-calls).

### A truncated distribution still looks complete

Every facet tool caps buckets at **100** by default — the ES `terms` aggregation is built
with `size = maxSize`, defaulting to 100 and ordered by count descending. The payload gives
no "truncated" flag: you just see fewer buckets than exist and a quietly low sum.

`maxSize` goes **inside `query`** and works on all three tools (`yaohai-facets`,
`product-cn-facets`, `reg-cn-facets`). Verified live 2026-09-06:

| Call | default | `{"query": {"maxSize": 500}}` |
|---|---|---|
| `yaohai-facets` `jicai.jc_project` | 100 buckets, sum 891,595 | **128** buckets, sum 892,528 |
| `product-cn-facets` `std_dosage_form` | 100 buckets, sum 242,884 | **165** buckets, sum 243,086 |
| `reg-cn-facets` `rd_status` | 4 buckets (field is small) | 4 buckets — no truncation |

`std_dosage_form` is the trap worth remembering: a **165**-value field silently rendered as
100, losing 65 dosage forms. The response looked complete.

Three habits follow:

- **Exactly 100 buckets ⇒ assume truncation.** Re-request with a larger `maxSize` before
  summarizing. A field that genuinely has 100 values is rare enough not to bet on.
- **Never present a truncated distribution as "the breakdown".** If you keep the default,
  say so: "前 100 类（按数量排序），长尾未展开".
- **`maxSize` is not a filter.** It is echoed into `query_applied`, so do not read it back
  as a condition you applied to the data.

### Date and range facets are per-value, not per-interval

`product-cn-facets` and `reg-cn-facets` do return date and range fields, but there is no
date-histogram or interval option — each distinct value gets its own bucket, sorted by count
descending:

- **Date fields** return `value` as **epoch milliseconds**. Divide by 1000 and format as UTC
  to recover the date: `820454400000` → `1996-01-01`. Never show the raw integer to the
  user.
- **Range fields** (`general_name_count`, `market_num`, …) return one bucket per distinct
  integer, not histogram bins.

Because the sort is by count and the cap is 100 buckets, **the default date distribution is
not a timeline** — it is the 100 busiest days. Verified live on `product_cn`
(`first_approve_date`, 2,582 distinct days, database total 243,104 rows):

| Call | Buckets | Sum | Chronological span |
|---|---|---|---|
| default | 100 | 174,784 (72%) | 1981-01-01 … 2026-08-04 |
| `maxSize: 1000` | 1,000 | 232,118 | 1981-01-01 … 2026-08-25 |
| `maxSize: 5000` | **2,582** (all) | 242,711 | 1955-01-01 … 2026-08-25 |

The default view does reach 2026, but only by accident — a few recent high-volume days make
the cut. **29 of the top 100 buckets are 1 January**, and together they hold 151,054 rows:
86% of everything the default facet reports. Grouping those buckets by year produces a curve
that collapses to almost nothing after 2009, purely an artifact of the cap.

### Year-only dates masquerade as 1 January

Those 1 January buckets are not real days. Older DrugSea records store only a **year**, and
the backend materializes it as `YYYY-01-01`. Confirmed by filtering:

```jsonc
// ✓ first_approve_date "1996-01-01 to 1996-01-01" → total 60,544
// ✓ first_approve_date "1996-01-02 to 1996-12-31" → total 0
```

The matching rows carry `listing_date: "1996"` — a bare year string — next to
`first_approve_date: "1996-01-01"`, and their `approve_date` is a genuine full date
(2026-08-11). So the day and month on those rows are **placeholder noise**.

Practical consequences:

- **Never say "approved on 1996-01-01".** Say "1996 年（该库仅存年份，月日缺省为 1 月 1 日）".
- **`listing_date` is year-only by design** — prefer it for "what year" questions rather than
  reverse-engineering the date field.
- **Treat 1 January counts as year totals**, not daily ones. A spike on any other day is real.

**For any temporal breakdown, do not facet the date field.** Issue searches over explicit
date ranges and read each `total`:

```jsonc
// ✓ one call per year, exact, and immune to the 100-bucket cap
{"query": {"ATC_code": "L", "first_approve_date": "2024-01-01 to 2024-12-31"}, "limit": 1}
```

Date facets are still useful for discovery inside a *small* filtered query — "which distinct
days does this result set touch" — never for a trend you intend to narrate.


### `supported: false` is not an error

Asking `yaohai-facets` about `product_cn` or `reg_cn` returns a **successful-looking**
response with `supported: false` and a hint naming the dedicated tool. Nothing throws. If
you read `facets` without checking `supported`, you will conclude the database has no
dimensions and report an empty breakdown.

```jsonc
// ✓ check this first
{"dbname": "product_cn", "fields": ["ATC_code"]}
// → {"supported": false, "hint": "use product-cn-facets ..."}
```

Conversely an unknown *field* on a supported database **does** throw with the valid list —
so a throw is informative and `supported: false` is not. Read the payload, not the exit
status. See [query-syntax.md](query-syntax.md#yaohai-facets-throws-where-search-silently-drops).


## Field selection

List rows carry 40–60 fields, many of them internal (`ProductID`, `XUI`, `DrugUID`,
`dp2_id`, `gcid`, `updated_at`, `created_at`, `related_drug_names`). **Never render the raw
item object.**

Pick columns by question type:

| Question type | Columns to show |
|---|---|
| Identity / "does X exist" | 药品名称, 批准文号 or 受理号, 生产企业, 规格 |
| Approval status / timeline | 药品名称, `first_approve_date`, `approve_date`, 注册分类, 研发状态 |
| Pipeline / review progress | 受理号, 药品名称, 企业名称, 承办日期, 办理状态, 审评结论 |
| Access / reimbursement | 药品名称, 医保类型, 基药类型, 是否集采, OTC |
| Competitive landscape | 药品名称, 生产企业, 剂型, 规格, 首次上市日期 |
| Commercial volumes | 药品名称, 年份, 销售额/销量, 厂家数 |
| Trials | 登记号, 药品名称, 分期, 招募状态, 适应症, 申办方 |

Use `field_labels` from the response to get the Chinese label for each key rather than
translating field names yourself. It is authoritative and already in the payload.

Fields worth surfacing that users often ask about indirectly:

| Field | Why it matters |
|---|---|
| `first_approve_date` vs `approve_date` | First launch vs latest re-registration. Mixing these up produces wrong "approved in year X" answers. |
| `in_sfda` / `only_active` | Whether the approval is still valid. State it when listing approvals. |
| `innovation_degree` | 创新型 / 改良型 / 仿制型 — the innovator-vs-generic signal on `reg_cn`. |
| `first_generic_drug` | 首仿 / 潜在首仿 / 非首仿 — competitive position for generics. |
| `is_guojia_jicai`, `national_yibao`, `national_jiyao` | The three access flags. Usually all three are wanted together. |
| `general_name_count`, `product_count`, `dosage_count` | How crowded the molecule/dosage space is — a fast competitive read. |
| `market_num`, `apply_listing_num`, `apply_ctc_num` | Filed-vs-marketed manufacturer counts on `reg_cn`. |
| `related_slhs` | Links a marketed approval back to its CDE submissions — the bridge between `product_cn` and `reg_cn`. |

**Ignore `is_jicai`.** `product_cn` rows carry both `is_jicai` and `is_guojia_jicai`, and
they disagree — 国药准字H20051408 (立普妥) returns `is_jicai: "1"` but
`is_guojia_jicai: "否"`. `is_jicai` appears nowhere in the backend or frontend source; it
is a stale index column. `is_guojia_jicai` is the one the facet panel exposes and the one
to quote.

## Truncating long values

Several fields contain HTML or very long text. Strip and shorten:

- `indication`, `indications`, `dosage_and_administration`, `pharmacological_and_toxicological`
  contain HTML (`<div>`, `<p>`, `\r\n\t`). Strip tags, collapse whitespace, truncate to
  ~80–120 characters with an ellipsis.
- `related_drug_names` can hold 100+ pipe-separated synonyms (one row had ~90). Show the
  first 3–5 and say "等" / "and more".
- `national_yibao` is a `;`-separated list of every insurance edition. Summarize as a range
  ("国乙 2019–2025 版") instead of listing all eight.

Full text belongs in a detail drill-down, not a list table.

## Output templates

### Small result set (≤ 20) — table

```markdown
**阿托伐他汀钙片** — `product_cn`，`item=阿托伐他汀`，共 **277** 条，显示前 10 条：

| 药品名称 | 批准文号 | 生产企业 | 规格 | 首次上市 | 商品名 |
|---|---|---|---|---|---|
| 阿托伐他汀钙片 | 国药准字H20051408 | 晖致制药(大连) | 20mg | 2005-07-25 | 立普妥 |
| … | | | | | |

医保：国乙 2009–2025 版全部收录。国家基药（国基2018/2026版）。
```

All of that came from one row. Note `first_approve_date` (2005-07-25) vs `approve_date`
(2025-04-09) — quoting the second as "approved in 2005" would be wrong.

### Large result set (> 100) — breakdown first, then samples

```markdown
2024 年中国首次上市的抗肿瘤药：**317** 条（`product_cn`，
`ATC_code=L` + `first_approve_date=2024-01-01 to 2024-12-31`）。

按药品类型：
- 生物制品 — 多数为单抗/ADC
- 化学药品 — 多数为小分子靶向

示例 8 条：

| 药品名称 | 批准文号 | 持证商 | 首次上市 |
|---|---|---|---|
| 恩朗苏拜单抗注射液 | 国药准字S20269015 | 石药集团巨石生物 | 2024-06-25 |
| … | | | |

需要完整清单、按剂型/省份细分，或某个品种的详情，告诉我。
```

### Aggregation (`drugreg_cn`) — inherently a breakdown

```markdown
阿托伐他汀相关 CDE 申报，按企业聚合：**247** 家（`drugreg_cn`，
`sumBy=enterprise`，`sumTarget=slh`，count = 受理号去重数）：

| 企业 | 受理号数 |
|---|---|
| 齐鲁制药有限公司 | 8 |
| 齐鲁制药(海南)有限公司 | 6 |
| 默沙东研发(中国)有限公司 | 4 |

注：`total` 是分组数（企业数），不是申报总数。要看具体受理号请用 `reg_cn`。
```

### Cross-database answer — label the source

When one question was answered from several databases, say which number came from where.
Users otherwise assume the counts are comparable.

```markdown
奥希替尼（泰瑞沙 / Osimertinib）：

- **已上市**（`product_cn`，search_mode=1）：**12** 条批文 — AstraZeneca AB 进口，
  40mg / 80mg 片剂，2017-03-22 首次上市。国家医保乙类（2019–2025 版，含谈判药），
  国家基药，未进国家集采。
- **CDE 申报**（`reg_cn`，search_mode=1，默认排除备案）：**100** 条受理号 —
  已完结、已上市、在研、终止各状态并存。
- **全球品种**（`global_search`）：命中 2 个品种条目（奥美替尼 / 奥希替尼），
  但该库的 `*_drug_num` 计数为 0，说明全景库的上市计数未回填 — 上市数据以上面两个库为准。

两个中国库的 `search_mode` 默认值不同（product_cn=3，reg_cn=1），以上均已显式设为 1
以便对齐口径。
```

### Zero results — diagnose, don't guess

```markdown
`product_eu` 中 `active_substance=阿托伐他汀` 返回 **0** 条。

原因：EMA 库使用英文名称。改用 `Osimertinib` 这类英文活性成分名可命中
（已验证 `active_substance=Osimertinib` → 1 条）。

要我直接用英文名重查吗？
```

## Things not to do

- **Don't dump raw JSON.** The user cannot read 50 fields × 20 rows.
- **Don't page past ~3 pages.** If `total` is large, summarize instead.
- **Don't present a sample as if it were the full set.** State `total` and how many you
  are showing.
- **Don't invent a frontend URL.** Only include `detail_url` when it is a working API URL
  (`yaohai-search` / `yaohai-global-search`). For `product_cn` / `reg_cn` it is
  `https://db.drugsea.cn/api/disabled` — omit it and offer a detail drill-down instead.
- **Don't mix `total` from different `search_mode` values** without saying so.
- **Don't report a facet count as a precise figure.** Confirm with a filtered search.
- **Don't hide a partial failure.** If one distribution came back `success: false` because
  of the daily quota, say that dimension was unavailable rather than omitting it silently.
