---
name: drug-project-initiation
description: >-
  药品立项调研报告：仿制/改良立项、可行性评估、FTO 专利自由实施、竞争格局、市场准入。
  Produces a print-ready A4 HTML due-diligence report for a drug product: collects
  evidence from the 63 DrugSea databases via the `user-drugsea` MCP namespace, scores
  the variety on three independent probabilities (可获批 / 可合法上市 / 值得做), draws
  ECharts figures, and assembles 封皮 / 目录 / 正文 / 参考文献 / 封底. Use when the user
  asks for 立项调研、立项报告、品种可行性、能不能仿、专利到期能不能做、竞争格局分析，
  or names a drug and asks whether to start a program on it.
---

# 药品立项调研报告

Three phases, in order. Do not skip Phase 1 and do not start writing prose before
Phase 2 produces numbers.

```
Phase 1  采数   十个模块 M1–M10，全部走 user-drugsea MCP
Phase 2  打分   三概率 P1/P2/P3 + 立项综合分 + 情景分析
Phase 3  成稿   A4 打印就绪 HTML，浏览器逐页校验
```

## Golden rules

1. **三概率不可合并。** 立项失败的典型原因不是「不能仿」，而是「能仿但不能卖」。
   永远分开报告 P1 可获批、P2 可合法上市、P3 值得做，不要压缩成一个总分。
2. **0 条 ≠ 不存在。** 某库返回 0 条只说明该库没有记录，一律标注「不可得」并列入
   数据局限清单。**绝不估算、外推或编造补齐。**
3. **专库优先。** 库间口径冲突时以专库为准（例：`product_cn` 的医保字段常年滞后，
   医保身份以 `yibao` + `nhsa_code` 为准）。冲突本身要写进报告。
4. **锚定日期。** 报告首页必须标明数据截止日；所有「到期」「执行期」类结论都要带具体日期。

## Phase 1 — 采数（M1–M10）

一律通过 `user-drugsea` MCP；路由与字段键查 `skills/drugsea/SKILL.md` 及其 `reference/db-*.md`。
可并行发起同一模块内的多个查询。

| 模块 | 要回答的问题 | 主要库 |
|---|---|---|
| M1 品种身份 | 通用名/商品名/文号/持证商/剂型规格/ATC/包装 | `product_cn`、`product_jp`、`nhsa_code` |
| M2 参比与路径 | 参比批次编号规格来源、过评数、BE 数、申报类别 | `cn_reference_drugs`、`generic_cn`、`yzpj_products` |
| M3 申报竞争 | 4 类受理号、企业清单、首仿标记、状态/剂型分面 | `reg_cn`、`ct_cn` |
| M4 专利（决定 P2） | 登记专利、权利类型、到期日、声明类型分布 | `zldj`、`zlsm`、`nmpa_reg_patent` |
| M5 原料与技术 | 原辅包登记家数与状态、境外 DMF | `cde_yfb_registration`、`fda_dmf` |
| M6 临床定位 | 对照药、III 期结论、同类替代基线 | `ct_global`、`ct_cn`、`generic_cn` |
| M7 市场准入 | 医保身份与编码、基药、集采、招标挂网价 | `yibao`、`nhsa_code`、`jiyao`、`jicai`、`zhaobiao` |
| M8 销售 | 国内医院销售、境外全终端销售与渠道结构 | `sales_cn`、`drugsales` |
| M9 全球对照 | 各地区上市状态、境外仿制 | `product_jp`、`product_us`、`product_eu` |
| M10 时间线 | 授权→上市→参比→专利公示→到期的节点串 | 以上各库汇总 |

**M4 是决定性模块。** 化合物专利未到期时 P2 默认取低值，此时无论 P1 多高都不能得出
「建议立项并投产」。声明类型的含义：2 类（不属可登记/已宣告无效）、3 类（到期前不上市）、
4.1 类（应被宣告无效）、4.2 类（不应登记）。

采数的库特异性陷阱（限流、字段别名、占位日期等）见
[reference/data-collection.md](reference/data-collection.md)。**首次使用必读**，
其中的坑会静默返回错误结果而不报错。

## Phase 2 — 打分

六个基础维度，权重固定：

| 维度 | 权重 | 维度 | 权重 |
|---|---|---|---|
| 法规与参比 | 15% | 竞争窗口 | 15% |
| CMC 与 BE | 15% | 市场准入 | 20% |
| 专利 | 30% | 时间匹配 | 5% |

三概率与综合分：

```
P1 可获批    = 法规×0.5 + CMC×0.5          通过线 70，低于此线不必继续
P2 可合法上市 = 专利维度得分                 化合物专利未到期时取低值
P3 值得做    = 竞争×0.4 + 市场×0.5 + 时间×0.1
立项综合     = 0.25×P1 + 0.40×P2 + 0.35×P3
```

决策带：

| 综合分 | 附加条件 | 结论 |
|---|---|---|
| ≥ 70 | 且 P2 ≥ 60 | 建议立项，按专利到期日排产 |
| 45–70 | 或 P2 < 40 但 P1 很高 | 跟踪 / 卡位 |
| < 45 | 或 P2 < 25 且无可靠 4.2 类依据 | 暂缓 |

至少跑三个情景：基准（3 类声明，到期前不上市）、专利到期后上市、4.1 类挑战成功。
每个维度的评分标尺（什么情况给 90、什么情况给 30）与算例见
[reference/scoring-framework.md](reference/scoring-framework.md)。

**自检**：写完打分表后重算一遍 P3 与综合分。加权算错是这套框架最常见的错误，
且会直接改变决策带归属。

## Phase 3 — 成稿

复制 [templates/report-template.html](templates/report-template.html) 起稿，勿从零写 CSS。

章节顺序（缺一不可）：

```
封皮      密级条 / 品种识别块 / 核心结论三概率 / 数据截止日 / 免责声明
目录      一二级标题 + 实测页码（见下）
一        背景分析（疾病机制、为何进入视野、竞争环境）
二        调研框架与数据来源（三概率定义、权重、检索纪律）
三～十一   逐模块数据分析，每章先摆表/图再给解读
十二      量化打分与情景分析
十三      结论与建议（做什么 / 不做什么 / 跟踪触发条件）
十四      风险提示与数据局限（不可得清单）
十五      参考文献（按引用顺序，标库名 + 检索项 + 关键编号）
封底      一句话结论 / 下一步动作 / 数据来源与免责
```

图表编号按章：表 3-1、图 5-1。建议 5–8 张图，每章不超过 2 张。

### 排版契约

- 一个 `<section class="sheet">` 就是一页 A4。屏幕与打印严格 1:1。
- 页面净高 **1123px**（A4 @96dpi）。超出即在打印时裂页并使手写页码全部错位。
- 每页填充率目标 **62%–98%**。低于 62% 用真实数据补内容（把段落里的计数拆成表、
  加图），**不要靠拉大行距或空段落充页**。
- ECharts 必须用 `renderer: 'svg'`，打印后是矢量而非位图。

### 校验循环（必做，不可跳过）

```bash
skills/drug-project-initiation/scripts/audit_pages.sh <报告绝对路径>
```

输出每页高度、填充率、PDF 实际页数与对照图路径。反复修到
`over=0`、无低填充页、PDF 页数 == sheet 数为止，然后 Read 对照图做视觉确认。

目录页码只在校验通过后回填——脚本会打印各章实测页码，据此写入
`<span class="pn">`，不要估算页码。

HTML 结构细节、ECharts 图型选择、标签避让、可选的 docx 产出见
[reference/report-layout.md](reference/report-layout.md)。

## 交付

主交付物是 HTML（自带打印样式，`Cmd+P` 即得 PDF）。
若用户要 Word，用 `officecli` 技能另出一份 docx，数据必须与 HTML 同源同值。
