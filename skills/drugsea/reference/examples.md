# End-to-end examples

Fifteen realistic questions, each traced from the user's words to exact tool calls. All
counts were verified live against `db3.drugsea.cn` on 2026-09-05 and will drift as the
data updates — treat them as shape checks, not facts to quote.

The pattern in every recipe is the same: **route → prepare keywords → confirm values →
search → present**. You do the routing and keyword preparation yourself; there is no
auto-router.

---

## 1. "阿托伐他汀在中国的上市情况"

**Routing.** "上市" → marketed → `product_cn`.

**Keyword prep.** The user gave the ingredient (成分词), not a product name. Use `item`
(full-text) for coverage; `search_mode` defaults to 3 (partial), which is right here.

```jsonc
// product-cn-search
{"query": {"item": "阿托伐他汀"}, "limit": 20}
```

→ `total: 277`. Rows are individual approvals (批准文号), not molecules.

Then get the shape before presenting:

```jsonc
// product-cn-facets
{"query": {"item": "阿托伐他汀"},
 "facets": ["ATC_code", "drug_type", "std_dosage_form", "national_yibao", "is_guojia_jicai"]}
```

→ ATC `C` (277), 化学药品 (277), and `national_yibao` spanning 国乙2009版–国乙2025版.

**Present.** 277 > 20, so lead with the breakdown and 5–10 sample rows. See
[result-presentation.md](result-presentation.md).

---

## 2. "立普妥是哪个公司的，什么时候上市的"

**Routing.** A brand name + specific-record questions → `product_cn`.

**Keyword prep.** 立普妥 is a 商品名 stored in `brand_name`. Use **`brand_name`**, not
`item` — they differ a lot:

```jsonc
// product-cn-search
{"query": {"brand_name": "立普妥"}, "limit": 5}   // → total 62, all genuinely 立普妥 ✓
{"query": {"item": "立普妥"}, "limit": 5}          // → total 190, top hit is a 深圳奥萨 generic ✗
```

`item` matches `related_drug_names`, a pre-built synonym cluster shared by **every**
atorvastatin product, so searching a brand name with `item` returns the whole molecule
family — and the first row is not the branded product at all. This is the single easiest
way to produce a confidently wrong answer.

Then drill into the record. Take `id` from the row (an encrypted string), **not** the
批准文号:

```jsonc
// product-cn-detail
{"id": "SGT6lNRglKyaF7Syuj3rFg**"}
```

Verified values for 国药准字H20051408: 持证商 晖致制药(大连)有限公司 (originally
辉瑞制药有限公司 / Pfizer Pharmaceuticals Co., Ltd), `first_approve_date` **2005-07-25**,
`listing_date` 2005, 规格 20mg, 国家基药 (国基2018/2026版), 目录集收录
(`is_orange_book: 是`), `ATC: C10AA05`. Its 10mg sibling is 国药准字H20051407.

**Two traps.** The same row has `approve_date: 2025-04-09` — the latest *re-registration*,
not the launch; answering "2025年上市" would be wrong. And `manufacture` on this row is the
compound string `晖致制药(大连)有限公司; Viatris Pharmaceutical (Dalian) Co., Ltd.`, so a
`search_mode: 2` exact array match on just the Chinese name returns 0. Read company names
from rows; don't try to exact-match them.

---

## 3. "奥希替尼现在在 CDE 是什么审评进度"

**Routing.** "审评进度" / CDE → pipeline → `reg_cn`.

**Keyword prep.** Ingredient name. `reg_cn` defaults to `search_mode=1` (related), which
matches `related_drug_names` — good for an ingredient, since it catches 泰瑞沙 / TAGRISSO /
AZD9291 / Osimertinib too.

```jsonc
// reg-cn-search
{"query": {"drug_name": "奥希替尼", "search_mode": 1}, "limit": 20}
```

→ `total: 100`. Note `rows_excluded: 1` is injected, so 备案 filings are excluded. To
include them, pass `"rows_excluded": 0`.

**Do not** use `search_mode: 2` with the ingredient alone:

```jsonc
{"query": {"drug_name": "奥希替尼", "search_mode": 2}}        // → total 0   ✗
{"query": {"drug_name": "甲磺酸奥希替尼片", "search_mode": 2}}   // → total 87  ✓
```

Mode 2 is exact whole-value matching, so the value must include the dosage form.

---

## 4. "这个药上市了还是在研" — marketed vs pipeline

**Routing.** Ambiguous → query **both** and say which number came from where.

The critical detail: `product_cn` defaults to `search_mode=3` and `reg_cn` to
`search_mode=1`. **Set it explicitly on both** or the two counts are not comparable.

```jsonc
// product-cn-search
{"query": {"drug_name": "奥希替尼", "search_mode": 1}, "limit": 5}
// reg-cn-search
{"query": {"drug_name": "奥希替尼", "search_mode": 1}, "limit": 5}
```

→ marketed **12**, pipeline **100**.

A drug appearing in both is normal: `product_cn` holds marketing authorizations, `reg_cn`
holds every submission including ones that later became approvals. `related_slhs` on a
`product_cn` row links back to its CDE submissions.

For a cross-market picture first:

```jsonc
// yaohai-global-search
{"query": {"term": "osimertinib"}, "limit": 10}
```

→ 2 molecule entries (奥美替尼 / 奥希替尼). Their `china_drug_num` / `usa_drug_num` were
both 0, so the panorama's counts are not populated — use them for discovery only, then
re-query the specific databases for real numbers.

---

## 5. "2024 年中国批准的抗肿瘤药"

**Routing.** Therapeutic area + date → `product_cn` with an ATC filter.

**Keyword prep.** 抗肿瘤 → ATC letter **L** (see
[atc-therapeutic-classes.md](atc-therapeutic-classes.md)). "2024年批准" means *first*
approval → `first_approve_date`, **not** `approve_date`.

```jsonc
// product-cn-search
{"query": {"ATC_code": "L", "first_approve_date": "2024-01-01 to 2024-12-31"}, "limit": 20}
```

→ `total: 317`. (All classes together in 2024: 3,533.)

Date grammar is strict: `YYYY-MM-DD`, zero-padded, literal ` to ` with spaces. `"2024-1-1
to 2024-12-31"` falls through to `match_phrase` and returns HTTP 400.

---

## 6. "降糖药有哪些，哪些进了医保"

**Routing.** 降糖药 → ATC **A** (A10 糖尿病用药). But `A` also covers all other
alimentary/metabolism drugs, so a bare `A` filter is too broad for "diabetes only".

**Be honest about this.** Either name the molecules, or filter on `A` and say it is broader
than diabetes:

```jsonc
// product-cn-search — broader than diabetes, covers all of ATC A
{"query": {"ATC_code": "A", "national_yibao": "国乙2025版"}, "limit": 20}
```

Better for a diabetes-specific answer — query the molecules individually:

```jsonc
{"query": {"item": "二甲双胍", "national_yibao": "国乙2025版"}, "limit": 20}
{"query": {"item": "达格列净"}, "limit": 20}
```

`national_yibao` values come back from facets as `国乙2025版`, `国乙2024版谈判药`, `其他`,
etc. Copy them verbatim — array values are matched with `terms`, so `"国乙"` alone matches
nothing.

---

## 7. "齐鲁制药有多少个上市品种"

**Routing.** Company + count → `product_cn`.

**Keyword prep.** The company field on `product_cn` is **`manufacture`**, not `enterprise`:

```jsonc
// product-cn-search
{"query": {"manufacture": ["齐鲁制药有限公司"], "search_mode": 2}, "limit": 20}
```

→ `total: 554`. `search_mode` goes **inside** `query`.

The wrong key silently returns the entire database:

```jsonc
{"query": {"enterprise": ["齐鲁制药有限公司"]}}   // → total 243,104 = whole DB  ✗
```

If you want the count grouped rather than row-by-row, `product_cn` also supports
`view_type: "list_by_manufacture"`.

---

## 8. "哪些企业在申报阿托伐他汀，各报了多少"

**Routing.** "哪些企业…各多少" is a **counting** question → `drugreg_cn` (the aggregation
engine), not `reg_cn`.

```jsonc
// yaohai-search dbname=drugreg_cn
{"query": {"drug_name": "阿托伐他汀", "sumBy": "enterprise", "sumTarget": "slh"}, "limit": 20}
```

→ `total: 247` **groups**. Top: 齐鲁制药有限公司 8, 齐鲁制药(海南)有限公司 6,
默沙东研发(中国)有限公司 4. `count` is `count(distinct slh)`.

`total` here is the number of groups, **not** the number of filings. Say so, or the user
will read "247 家申报" as "247 个受理号".

Without `sumBy` the default groups by `general_name` (12 groups) — useful for "which
combination products exist".

To get the actual submission records afterwards, switch to `reg_cn`:
`{"query": {"item": "阿托伐他汀"}}` → 860 rows.

---

## 9. "阿托伐他汀的临床试验有哪些"

**Routing.** Trials → `ct_cn` (China) and/or `ct_global` (worldwide).

**Keyword prep.** On `ct_cn`, `item` is the SPA 全文框（药名/企业/适应症/登记号）;
`drug_name` is 相关药物 only. Coverage differs a lot. 申报企业 is `study_sponsor`,
not `sponsor`.

```jsonc
// yaohai-search dbname=ct_cn
{"query": {"item": "阿托伐"}, "limit": 20}          // → 355
{"query": {"drug_name": "奥希替尼"}, "limit": 20}    // → 43
```

A drug mentioned only in a trial title is found by `item` but not `drug_name`. Start with
`item`, narrow with `drug_name` for precision.

`ct_global` is English-only. Related drug is `interventions` (plural); 申报企业 is
`study_sponsor`; 登记号 is `identifier`:

```jsonc
{"query": {"item": "atorvastatin"}, "limit": 20}    // → 961
```

Rows carry `source` (`CTR` / `ChiCTR`) — worth mentioning, since the two registries differ
in what they require.

---

## 10. "这个药在美国/欧盟有没有上市"

**Routing.** Named market → `product_us` / `product_eu` / `product_jp`.

`product_us` handles Chinese keywords fine:

```jsonc
{"dbname": "product_us", "query": {"item": "阿托伐"}, "limit": 20}   // → 166
```

**`product_eu` needs English names**, and its key is `active_substance`, not `substance`:

```jsonc
{"dbname": "product_eu", "query": {"active_substance": "Osimertinib"}, "limit": 20}  // → 1 ✓
{"dbname": "product_eu", "query": {"active_substance": "阿托伐他汀"}, "limit": 20}    // → 0 ✗
{"dbname": "product_eu", "query": {"substance": "atorvastatin"}, "limit": 20}         // → 2661 = whole DB ✗
```

The catalog lists `substance` as a search field but the backend reads `active_substance` —
`substance` is silently dropped. ATC filtering works with a letter: `{"ATC_code": "L"}` → 674.

---

## 11. "阿托伐他汀进医保了吗，是甲类还是乙类"

**Routing.** Insurance status lives on the `product_cn` row itself (`national_yibao`,
`state_yibao`, `yibao`). Only go to `yibao` if you need the catalogue entry as a record.

```jsonc
// product-cn-facets
{"query": {"item": "阿托伐他汀"}, "facets": ["national_yibao", "national_jiyao", "state_OTC"]}
```

Row values read directly: `state_yibao: 国(乙)`, `national_yibao: 国乙2009版; …; 国乙2025版`,
`national_jiyao: 国基2026版; 国基2018版`.

So: 国家医保**乙类**, continuously since the 2009 edition, and on the national
essential-drug list.

Cross-check in the dedicated database:

```jsonc
{"dbname": "yibao", "query": {"item": "阿托伐他汀"}, "limit": 20}
{"dbname": "jiyao", "query": {"item": "阿托伐"}, "limit": 20}    // → 34
```

**Ignore the `is_jicai` column.** 立普妥 returns `is_jicai: "1"` but
`is_guojia_jicai: "否"`; `is_jicai` appears nowhere in the source and is stale. Quote
`is_guojia_jicai`.

---

## 12. "阿托伐他汀通过一致性评价了吗"

**Routing.** 一致性评价 → `product_cn` flags, or `generic_cn` for variety-level counts.

`product_cn` has a **virtual OR field** for this:

```jsonc
// product-cn-search
{"query": {"item": "阿托伐他汀", "gj_passed_yizhi": 1}, "limit": 20}   // → 117
```

`gj_passed_yizhi=1` matches `is_passed_yizhi=1 OR is_orange_book=1` — it is not a stored
column. That is why 117 < 277: only the passed/orange-book subset.

For the variety-level rollup:

```jsonc
// yaohai-search dbname=generic_cn
{"query": {"drug_name": "阿托伐他汀"}, "limit": 20}   // → 7 varieties
```

Rows carry `yzpj_passed` (已过评), `yzpj_not_passed`, `listing_num`, `jicai_num`,
`reference_drug_num`.

**`generic_cn` only supports `drug_name` reliably.** `enterprise` is silently dropped
(returns all 3,823 varieties) and `manufacture` throws a real SQL error:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'manufacture' in 'where clause'
```

For "company X's consistency-evaluation products", use `product_cn` with `manufacture`
plus `is_passed_yizhi` instead.

---

## 13. "奥希替尼是什么靶点，作用机制"

**Routing.** Mechanism/target → `targets`, plus the insert for the authoritative wording.

```jsonc
// yaohai-search dbname=targets
{"query": {"item": "EGFR"}, "limit": 20}    // → 6
```

Then the package insert, which carries the full 药理作用 text:

```jsonc
// yaohai-search dbname=shuomingshu
{"query": {"drug_name": "奥希替尼"}, "limit": 5}
```

`product_cn` detail also returns `pharmacological_and_toxicological` as HTML. Strip tags
and truncate for the answer — the raw field is thousands of characters.

From the verified `reg_cn` row: 奥希替尼 is an EGFR kinase inhibitor binding irreversibly
to T790M / L858R / exon-19-deletion mutants, indicated for EGFR-mutant NSCLC.

---

## 14. "最近有哪些新的 CDE 受理"

**Routing.** Date-bounded pipeline monitoring → `reg_cn`.

A bare date works as an exact-day filter (verified: 2024-05-01 → 24 rows):

```jsonc
// reg-cn-search
{"query": {"undertake_date": "2026-09-04"}, "limit": 30}
```

For a window, use the range grammar:

```jsonc
{"query": {"undertake_date": "2026-08-01 to 2026-08-31", "innovation_degree": "创新型"}, "limit": 30}
```

`innovation_degree` values are 创新型 / 改良型 / 仿制型 / 其他 — copy verbatim from a facet
call if unsure.

Pair with `china_new_drugs` for 1类/创新药 specifically, and `nmpa_buchongbeian` for
补充申请备案.

---

## 15. Handling a large result set

**Question:** "中国所有他汀类药物的批准文号"

```jsonc
// product-cn-search
{"query": {"item": "他汀"}, "limit": 20}
```

Suppose `total` comes back in the thousands. Do **not** page through it — `limit` caps at
100 and you could never enumerate the set anyway.

Instead:

1. Facet to show the composition:
   ```jsonc
   // product-cn-facets
   {"query": {"item": "他汀"}, "facets": ["general_name_cn", "std_dosage_form", "province", "is_guojia_jicai"]}
   ```
2. Present the breakdown + 5–10 sample rows + the exact `total`.
3. Offer to narrow: by ingredient, by dosage form, by company, by year.

If a facet comes back `"success": false` with
`您今日已达当前页面最大访问量，请升级或明日再来`, the daily facet quota is exhausted. Fall
back to filtered searches and read `total`, and say that dimension was unavailable.

---

## 16. "集采里有哪些药品类型，各占多少" — a `yaohai-facets` walkthrough

**Routing.** 集采 → `jicai` (a `dbs`-route database). The question asks for a *distribution*
(各占多少), not records, so this is a facet job, not a search job. `jicai` is one of the 44
databases `yaohai-facets` covers — check the `db-*.md` facet table or call discovery mode
first.

**Step 1 — confirm the facet field names.** Do not guess. Either read the `jicai` table in
[db-access-sales.md](db-access-sales.md) or ask the tool:

```jsonc
// yaohai-facets — discovery mode (no `fields`)
{"dbname": "jicai"}
```

**Step 2 — fetch the distribution.** Ask only for the fields you need (one HTTP request
fires per field):

```jsonc
// yaohai-facets — fetch mode
{"dbname": "jicai", "fields": ["jc_type"]}
```

*Observed:* 3 buckets summing to 892,528 — 联盟集采 838,695 / 国家集采 35,397 /
省市集采 18,436.

**Step 3 — watch for the 100-bucket cap.** If you facet a high-cardinality field like
`jc_project` (procurement project names) and get back **exactly 100** buckets, the tail is
truncated. Raise `maxSize`:

```jsonc
{"dbname": "jicai", "fields": ["jc_project"], "query": {"maxSize": 500}}
```

*Observed:* default = 100 buckets (sum 891,595); `maxSize: 500` = **128** buckets (sum
892,528). The field really has 128 values; the default silently dropped 28. `maxSize` is a
bucket limit, not a filter, and it is echoed in `query_applied` even though it is not one.

**Step 4 — present honestly.** Buckets come back sorted by count descending and exclude
rows where the field is empty, so a facet sum is *not* the row count. For a precise figure,
confirm with a filtered `yaohai-search` and cite `total`. See
[result-presentation.md](result-presentation.md).

**What would go wrong here.** Passing a search-only key like `item` in `fields` **throws**
(`Unknown facet field(s) for jicai: item. Valid fields: …`) — the opposite of search, where
an unknown key is silently dropped and returns the whole database. And `product_cn` /
`reg_cn` are *not* in this tool's catalog: they return `supported: false` with a hint
pointing at `product-cn-facets` / `reg-cn-facets`.


## Keyword-preparation habits these examples share

| Habit | Why |
|---|---|
| Ingredient vs product name — pick deliberately | Mode 2 needs the full product name; modes 1/3 take the ingredient. |
| Chinese for CN databases, English for `product_eu` / `ct_global` / `global_search.term` | Those stores hold English values; Chinese returns 0. |
| Brand name → `item`, or `search_mode=1` | Brands live in `related_drug_names`, which mode 1 targets. |
| Disease area → ATC letter, not a keyword | Keyword-searching "抗肿瘤" misses most oncology drugs. |
| "First approved" → `first_approve_date` | `approve_date` is the latest re-registration. |
| Counting question → `drugreg_cn` with `sumBy` | `reg_cn` gives rows; `drugreg_cn` gives groups. |
| Copy facet values verbatim into arrays | Arrays are `terms` — exact whole-value matching, no substring. |
| Check that `total` actually dropped | If it equals the full DB size, your key was silently ignored. |
