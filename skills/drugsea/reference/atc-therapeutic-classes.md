# ATC therapeutic classes

Use this whenever a question is phrased as a **disease area** or **therapeutic class**
rather than a drug name — "oncology drugs approved in China", "降糖药有哪些", "antibiotics
in the CDE pipeline", "cardiovascular generics".

Searching such a question as a keyword is wrong. The right move is an `ATC_code` facet
filter.

## Which databases support ATC filtering

| dbname | ATC field key(s) | Notes |
|---|---|---|
| `product_cn` | `ATC_code` | Facet + filter. **Single letter only** (`C`, `L`, …). |
| `reg_cn` | `ATC_code` (labelled ATC一级分类), `ATC` (tree) | `ATC_code` = single letter. `ATC` accepts full tree codes. |
| `product_us` | — | No ATC facet; use `SubmissionClassification` / `drug_type`. |
| `product_eu` | `ATC_code`, `therapeutic_area` | SPA 条件筛选; `yaohai-facets` fetches `GET /ema_drugs/eslist/{field}`. |
| `product_jp` | `ATC_code`, `ATC` (tree) | Same letter semantics as `product_cn`. `ATC_code` via `yaohai-facets`; `ATC` tree is `GET /c/get/atc/index2`. |
| `uk_emc` | `ATC_code` (治疗领域), `ATC` (tree) | `ATC_code` is facetable via `yaohai-facets`; the `ATC` tree is filter-only. |
| `hma` | `ATC` (tree) | Tree field only — `yaohai-facets` cannot aggregate it, so filter-only. |
| `generic_cn` | `ATC_code` | Defined in the panel file but **not rendered**. Do not treat as SPA 条件筛选. Letter filter may still work in `query`. |
| `sales_cn` | `ATC_code` (治疗分类) | `yaohai-facets` static list; values are `letter:中文`. |
| `drugsales` | — | Use `drug_type` / `administration_route`. |

### You cannot fetch every ATC distribution through MCP

`product_cn` / `reg_cn` (dedicated tools), `uk_emc`, `product_eu`, and `product_jp`
expose `ATC_code` to an MCP facet tool. `sales_cn` ATC is a static `letter:中文` list
via `yaohai-facets` (`count` null). `generic_cn` does not render ATC. `hma` is tree-only.

That has two consequences:

- **Do not promise a distribution you cannot produce via MCP.** Date/tree ATC fields
  are not in `yaohai-facets`.
- **Tree fields (`ATC`) are never in `yaohai-facets`.** Passing `ATC` in `fields` throws
  `Unknown facet field(s)`. Use it in `query` to filter, and facet the sibling `ATC_code`
  letter instead where that tool exists.

### Field names are case-sensitive

`ATC_code`, not `atc_code`. The lowercase form throws with the valid list rather than
matching:

```jsonc
// ✗ throws: Unknown facet field(s) for uk_emc: atc_code. Valid fields: drug_type, legal_category, ATC_code.
{"dbname": "uk_emc", "fields": ["atc_code"]}
```

Read the error's valid-list — it is authoritative and saves a discovery round-trip.


## The letter-only rule

For `product_cn` and `reg_cn`, the `ATC_code` **filter** accepts only the first-level
letter. Verified live against `product_cn` with `item=阿托伐他汀`:

```json
// product-cn-facets → distributions.ATC_code.items
[{"value": "C", "count": 277}]
```

Full codes such as `C10AA05` are **not** returned by the facet and will not match. If you
need finer granularity than the letter, use `reg_cn`'s `ATC` tree field or filter on
`std_dosage_form` / `drug_type` / `indication` instead.

### The row-value trap

`ATC_code` means different things depending on where you read it:

| Where | Value form | Example |
|---|---|---|
| `product-cn-facets` distribution | single letter | `C` |
| `product-cn-search` list row | Chinese class name | `心血管系统` |
| `product-cn-detail` | single letter | `L` |

**Never copy an `ATC_code` value out of a list row into a filter.** It is the display
name, not the filter value. Use the letter table below.

### `sales_cn` special form

`sales_cn` renders its ATC facet as `letter:中文标签` (built client-side from
`getATCList()`), so the filter value is the bare letter but the displayed bucket is
`C:心血管系统`. Send the letter.

## First-level letters ↔ therapeutic areas

Source: live `/c/get/atc/index2` (14 top-level branches), cross-checked against the
mapping used in the `user-drugsea` MCP tool descriptions.

| Letter | Therapeutic area (official) | Common short form |
|---|---|---|
| **A** | 消化道及代谢 | alimentary tract & metabolism — **includes diabetes (`A10`)** |
| **B** | 血液和造血器官 | blood & blood-forming organs |
| **C** | 心血管系统 | cardiovascular system |
| **D** | 皮肤病用药 | dermatologicals |
| **E** | 辅料 | excipients — **not a WHO ATC branch**; 0 rows today, see below |
| **G** | 生殖泌尿系统和性激素 | genito-urinary system & sex hormones |
| **H** | 非性激素和胰岛素类的激素类系统用药 | systemic hormonal preparations (excl. sex hormones & insulins) |
| **J** | 系统用抗感染药 | antiinfectives for systemic use |
| **L** | 抗肿瘤药和免疫机能调节药 | antineoplastic & immunomodulating agents — **oncology** |
| **M** | 肌肉-骨骼系统 | musculo-skeletal system |
| **N** | 神经系统 | nervous system |
| **P** | 抗寄生虫药、杀虫药和驱虫药 | antiparasitic products, insecticides & repellents |
| **R** | 呼吸系统 | respiratory system |
| **S** | 感觉器官 | sensory organs |
| **V** | 杂类 | various — includes diagnostics & radiopharmaceuticals |
| **W** | 原料药 | active pharmaceutical ingredients (APIs) — **not a WHO branch** |
| **Z** | 中药 | traditional Chinese medicine — **not a WHO branch; the largest bucket** |

That is the complete list, taken verbatim from the frontend's `getATCList()`
(`frontend/src/utils/Util.js`), which is what builds the filter dropdown the user sees.
Labels above are its labels.

### This is not the WHO ATC tree

DrugSea extends WHO ATC with three letters of its own, and the three matter enormously —
one of them is a quarter of the database. Treating the letters as pure WHO is the single
most damaging mistake available here:

| Letter | Meaning | `product_cn` rows | `reg_cn` rows |
|---|---|---|---|
| **Z** | 中药 (TCM) | **68,772** (28% of 243,104) | 56,386 |
| **W** | 原料药 (APIs) | 125 | 168 |
| **E** | 辅料 (excipients) | 0 | 0 |

`Z` is the one to remember. **Any "all Chinese marketed drugs" count that ignores `Z`
silently drops 68,772 TCM approvals** — 夏枯草口服液, 强力枇杷露 and everything like them.
Conversely, a question about *chemical* drugs must exclude `Z` or the numbers are
meaningless. Verified live 2026-09-06:

```jsonc
// ✓ Z rows are TCM: sampling 50 returned drug_type=中药 for all 50
{"dbname": "product_cn", "query": {"ATC_code": "Z"}, "limit": 50}
// ✓ and the cross-check agrees: drug_type=中药 → total 68,305
{"dbname": "product_cn", "query": {"drug_type": "中药"}, "limit": 1}
```

The two counts differ slightly (68,772 vs 68,305) because `ATC_code` is multi-valued —
1,344 rows carry `Z` *and* `化学药品`. So `Z` is not exactly synonymous with
`drug_type=中药`; for a TCM count prefer `drug_type`, and use `Z` for ATC-shaped questions.

`E` (辅料) is in the frontend list but currently matches **0 rows in both databases**. It is
a live option in the UI with no data behind it. Don't report an empty `E` result as an
error, and don't treat excipients as reachable through ATC — use `drug_type=辅料` (476 rows)
or `药用辅料` (19) instead.

### Letters that exist in the data but not in the list

Four values come back from facets yet are **absent from `getATCList()`**, so the UI offers
no way to select them:

| Value | Where | Rows | What it means |
|---|---|---|---|
| `其他` | `reg_cn` only | **171,128** | "other" — the single largest `reg_cn` bucket |
| `Q` | `reg_cn` only | 16 | 未知-classified submissions |
| `U` | `product_cn` only | 2 | 未知; e.g. 欣表飛鳴S |
| `X` | `uk_emc` only | 1 | 未知; Mackenzies Smelling Salts (`ATC: R01A; R01; X; R`) |

Each database uses its own residual marker — `product_cn` picked `U`, `reg_cn` picked `Q`
plus the word `其他`, `uk_emc` picked `X`. **Never assume one database's letter set applies
to another**, and never assume a letter outside WHO is meaningless: check what it actually
returns.

`其他` at 171,128 rows is bigger than every real therapeutic class combined on `reg_cn`, and
its rows read `ATC_code: '未知'` — so it is an unclassified/pipeline bucket, not a
therapeutic area. **Do not fold it into a class total, and do not omit it silently.** If you
report a `reg_cn` ATC breakdown, name it as 未分类. The small ones (`Q` 16, `U` 2, `X` 1)
matter less for totals but will look like a bug if you report "letters A–V" and omit them.

You can still *filter* on these even though the dropdown omits them
(`{"dbname": "reg_cn", "query": {"ATC_code": "其他"}}` returns all 171,128), which is worth
doing to confirm the bucket is what you think it is.

### Letters that genuinely do not exist

`F`, `I`, `K`, `O`, `T` are in neither the frontend list nor the data — verified `total: 0`
on both `product_cn` and `reg_cn`. Sending them is a wasted call.

Do **not** conclude from the WHO tree that `E`, `Q`, `U` or `X` are invalid: `E` is an
official DrugSea option and the other three hold real rows. Check the tables above, not WHO.

### Verified live distribution on `product_cn`

Queried 2026-09-06 with `first_approve_date=2024-01-01 to 2024-12-31` — all **15** buckets
the facet returns, untruncated (well below the 100 cap). Useful as a sanity check that your
letter is valid and non-empty:

| Letter | Count | Letter | Count | Letter | Count |
|---|---|---|---|---|---|
| N 神经系统 | 533 | S 感觉器官 | 174 | D 皮肤病用药 | 91 |
| A 消化道及代谢 | 519 | G 生殖泌尿 | 168 | H 激素 | 27 |
| C 心血管系统 | 498 | M 肌肉-骨骼 | 160 | **Z 中药** | **16** |
| J 抗感染 | 420 | V 杂类 | 155 | P 抗寄生虫 | 2 |
| L 抗肿瘤 | 317 | B 血液 | 234 | | |
| R 呼吸系统 | 265 | | | | |

Note how differently the letters rank once you scope to a single year: `Z` collapses from
68,772 rows overall to **16** in 2024, because TCM approvals peaked in the 1990s bulk-import
era. **Never extrapolate a bucket's share from one year's facet to the whole database.**

**These buckets sum to 3,579, but the same filter's search `total` is 3,533.** The buckets
over-count by 46 because `ATC_code` is multi-valued — a combination product can be assigned
to two classes and is counted in both. (On `reg_cn` the discrepancy runs the other way,
with buckets *under*-counting because `terms` skips empty fields.) Either way: **facet
buckets are for discovering which letters exist, not for quoting sums.** Verify any figure
you report with a filtered search. See
[query-syntax.md](query-syntax.md#facet-counts-are-not-exact-and-do-not-sum-to-total).


## Disease / indication → letter quick map

| User says | Letter | Why |
|---|---|---|
| 肿瘤, 癌症, oncology, 抗肿瘤, 免疫治疗 | **L** | L01 抗肿瘤药, L02 内分泌疗法, L04 免疫抑制剂 |
| 自身免疫, autoimmune, 类风湿, IBD | **L** (primary) | L04 免疫抑制剂; some in M01 |
| 心血管, 高血压, 冠心病, 心衰 | **C** | C02 抗高血压, C01 心脏病治疗药, C07/C08/C09 |
| 降脂, 他汀, 高胆固醇, 血脂 | **C** | C10 血脂调节剂 |
| 糖尿病, 降糖, 胰岛素, GLP-1 | **A** | A10 糖尿病用药 — **not H**, despite being hormonal |
| 减肥, 肥胖 | **A** | A08 减肥药 |
| 抗感染, 抗生素, 抗菌, 抗病毒, 抗真菌 | **J** | J01/J02/J05 |
| 疫苗, vaccine | **J** | J07 疫苗类 |
| 呼吸, 哮喘, COPD, 咳嗽 | **R** | R03 阻塞性气管疾病, R05 咳嗽和感冒 |
| 中枢神经, 抑郁, 精神分裂, 焦虑, 癫痫, 疼痛, 麻醉 | **N** | N03/N05/N06/N02/N01 |
| 阿尔茨海默, 帕金森 | **N** | N04 抗震颤麻痹; N06/N07 |
| 皮肤, 银屑病, 痤疮, 湿疹 | **D** | D05/D10/D07 |
| 骨科, 关节, 痛风, 骨质疏松 | **M** | M01/M04/M05 |
| 眼科, 眼 | **S** | S01 |
| 耳科 | **S** | S02 |
| 妇科, 避孕, 生殖, 泌尿 | **G** | G03/G04 |
| 激素, 皮质类固醇, 甲状腺 | **H** | H02/H03 |
| 血液, 贫血, 抗凝, 血栓 | **B** | B01/B03 |
| 胃肠道, 抗酸, 腹泻, 便秘, 肝病 | **A** | A02/A06/A07/A05 |
| 维生素, 矿物质, 营养 | **A** or **V** | A11/A12; V06 一般营养药 |
| 诊断, 造影剂, 放射性 | **V** | V04/V08/V09/V10 |
| 寄生虫, 疟疾, 驱虫 | **P** | P01/P02 |

**Diabetes is the classic trap.** 降糖药 is ATC `A` (消化道及代谢 → A10), not `H`
(hormones). Insulins sit under `A10A`. Verify with a facets call before asserting counts.

## Level-2 groups (for interpretation, not for filtering)

`product_cn` / `reg_cn` will not filter on these, but they help you read results and
explain them to the user. `reg_cn`'s `ATC` tree field does accept them.

### A — 消化道及代谢
A01 口腔病药物 · A02 治疗与胃酸分泌相关疾病的药物 · A03 治疗功能性胃肠疾病的药物 ·
A04 镇吐药和止呕药 · A05 肝、胆疾病治疗药 · A06 治疗便秘的药物 ·
A07 止泻药，肠道抗炎/抗感染药 · A08 减肥药（食品除外） · A09 消化药（含酶） ·
A10 糖尿病用药 · A11 维生素类 · A12 矿物质补充剂 · A14 系统用药的同化剂 ·
A16 其它消化道和代谢药物

### B — 血液和造血器官
B01 抗血栓形成药 · B02 抗出血药 · B03 抗贫血药 · B05 血液代用品和灌注液 ·
B06 其它血液学用药

### C — 心血管系统
C01 心脏病治疗药 · C02 抗高血压药 · C03 利尿药 · C04 外周血管扩张剂 ·
C05 血管保护药 · C07 β-受体阻断药 · C08 钙通道阻断药 ·
C09 作用于肾素-血管紧张素系统的药物 · C10 血脂调节剂

### D — 皮肤病用药
D01 皮肤病用抗真菌药 · D02 润肤药和护肤药 · D03 创伤和溃疡治疗药 ·
D04 止痒药（含抗组胺药、麻醉药等） · D05 抗银屑病药 ·
D06 皮肤病用抗生素和化疗药 · D07 皮质甾体激素类皮肤病治疗药 · D08 消毒灭菌药 ·
D09 医用敷料 · D10 抗痤疮药 · D11 其它治疗皮肤病药物

### G — 生殖泌尿系统和性激素
G01 妇科用抗感染药和灭菌药 · G02 其它妇科用药 ·
G03 性激素和生殖系统调节药 · G04 泌尿药

### H — 非性激素和胰岛素类的激素类系统用药
H01 垂体和下丘脑激素及其类似药物 · H02 系统用药的皮质甾体激素类 ·
H03 甲状腺治疗药 · H04 胰腺激素类 · H05 钙内环境稳定药

### J — 系统用抗感染药
J01 系统用抗菌药 · J02 系统用药的抗真菌药 · J04 抗分支杆菌药 ·
J05 系统用药的抗病毒药 · J06 免疫血清和免疫球蛋白 · J07 疫苗类

### L — 抗肿瘤药和免疫机能调节药
L01 抗肿瘤药 · L02 内分泌疗法 · L03 免疫促进药 · L04 免疫抑制剂

### M — 肌肉-骨骼系统
M01 抗炎和抗风湿药 · M02 关节和肌肉疼痛局部用药 · M03 肌松药 · M04 抗痛风药 ·
M05 骨病治疗药 · M09 其它治疗肌肉-骨骼系统疾病的药物

### N — 神经系统
N01 麻醉药 · N02 镇痛药 · N03 抗癫痫药 · N04 抗震颤麻痹药 · N05 安定药 ·
N06 精神兴奋药 · N07 其它神经系统用药

### P — 抗寄生虫药、杀虫药和驱虫药
P01 抗原虫药 · P02 抗蠕虫药 · P03 抗体外寄生虫药（含杀疥螨药）、杀虫药和驱虫药

### R — 呼吸系统
R01 鼻腔用药 · R02 咽喉用药 · R03 阻塞性气管疾病用药 · R05 咳嗽和感冒用药 ·
R06 系统用抗组胺药 · R07 其它呼吸系统用药

### S — 感觉器官
S01 眼科用药 · S02 耳科用药 · S03 眼和耳科药物

### V — 其它
V01 过敏原 · V03 其它各种治疗用药品 · V04 诊断用药 · V06 一般营养药 · V08 造影剂 ·
V09 诊断用放射性药物 · V10 治疗用放射性药物

## Worked examples

**Q: 2024 年中国批准上市的抗肿瘤药有哪些？**

The question is a therapeutic area + a date range. Do not keyword-search "抗肿瘤".

```jsonc
// product-cn-search
{"query": {"ATC_code": "L", "first_approve_date": "2024-01-01 to 2024-12-31"}, "limit": 20}
```

Verified shape: `ATC_code=L` + `first_approve_date=2024-01-01 to 2024-12-31` returns
317 rows on `product_cn`. Use `first_approve_date` (品种首次上市日期), **not**
`approve_date` (最近再注册批准日期) — the latter would pull in re-registrations of old
drugs.

**Q: CDE 在研的抗感染药有多少？**

```jsonc
// reg-cn-search
{"query": {"ATC_code": "J", "rd_status": "在研"}, "limit": 20}
```

Verified: **2,669 rows**. `rd_status` live values on `reg_cn`: `已完结`, `已上市`, `终止`,
`在研`. Copy verbatim. Note the returned rows carry `ATC_code: "系统用抗感染药"` — the
Chinese label, confirming the row-value trap above. The *filter* value stays `J`.
Also note `reg_cn` injects `rows_excluded=1` and `search_mode=1` automatically
(visible in `query_applied`).

**Q: 阿托伐他汀属于哪个治疗领域，医保情况如何？**

Two steps — the molecule is named, so no ATC filter is needed:

```jsonc
// product-cn-facets
{"query": {"item": "阿托伐他汀"}, "facets": ["ATC_code", "national_yibao", "drug_type"]}
```

Returns `ATC_code: C (~279)`, `drug_type: 化学药品 (~279)`, and `national_yibao` buckets
`国乙2025版 (237)`, `国乙2024版 (231)`, … , `国乙2024版谈判药 (6)`, `其他 (40)`.
So: cardiovascular (C), chemical drug, national insurance class 乙 across every edition
since 2009.

**Q: 降糖药里哪些进了国家集采？**

```jsonc
// product-cn-search
{"query": {"ATC_code": "A", "is_guojia_jicai": "是"}, "limit": 20}
```

`A` covers A10 糖尿病用药 but also all other alimentary/metabolism drugs, so `A` alone is
too broad for "diabetes only". Better: keyword the ingredient class and cross-check.

```jsonc
{"query": {"item": "降糖", "is_guojia_jicai": "是"}, "limit": 20}
```

Or name the molecules (`二甲双胍`, `阿卡波糖`, `达格列净`) and query each. Always tell the
user which approach you took — ATC letter A is not a diabetes-specific filter.

## Verifying before you assert

Because ATC assignment in DrugSea is curated rather than derived, and because letters are
coarse, verify the letter actually matches something before reporting a count as fact.

**Do not facet the same field you are filtering on.** The facet call strips the faceted
field from the query, so this returns the *whole* distribution and tells you nothing about
your filter:

```jsonc
// ✗ useless — facets ATC_code while filtering ATC_code
{"query": {"ATC_code": "L"}, "facets": ["ATC_code"]}
```

Instead, confirm with a **search** and read `total`:

```jsonc
// ✓ product-cn-search
{"query": {"ATC_code": "L", "first_approve_date": "2024-01-01 to 2024-12-31"}, "limit": 5}
```

If `total` is 0, your letter matched nothing — your disease→letter mapping was wrong, not
the database. If `total` equals the entire database size, the key was silently dropped
(see [query-syntax.md](query-syntax.md)).

Conversely, facetting `ATC_code` **without** filtering on it is the right way to discover
which letters exist in a result set — e.g. facet `ATC_code` while filtering
`item=阿托伐他汀` to learn that the molecule sits in class `C`.
