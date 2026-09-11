# HTML 报告排版与图表

## 文档解剖

```html
<section class="sheet nochrome">   封皮（nochrome 隐藏页眉页脚）
<section class="sheet nochrome">   目录
<section class="sheet" id="c1">    第一章，带 .rh 页眉 + .rf 页脚
  <div class="rh">品名立项调研报告　·　数据截止 YYYY-MM-DD</div>
  <h3 class="ch">一、背景分析</h3>
  <h4 class="sec">1.1 小节</h4>
  <p>正文，自动首行缩进 2em</p>
  <div class="rf">第 1 页</div>
<section class="sheet">            续页：无 h3.ch，承接上一章
<section class="sheet nochrome">   封底
```

一个 `.sheet` = 一页 A4。续页不写 `h3.ch`，这样校验脚本能正确识别章起始页。

## 可用类

| 类 | 用途 |
|---|---|
| `p.lead` | 蓝底左边框，放方法论说明、定性结论 |
| `p.key` | 红底左边框，放硬约束与决定性判断。一页最多 1–2 个 |
| `p.noind` | 取消首行缩进 |
| `ul.bl` | 项目符号列表 |
| `div.cap` | 表/图标题，写在表格或图容器**之前** |
| `p.src` | 表/图下方来源注 |
| `td.n` / `th.n` | 数字右对齐 + 等宽数字 |
| `tr.tot` | 合计/关键行，加底色加粗 |
| `ol.ref` | 参考文献，自动编号 `[1]` 悬挂缩进 |
| `.chart` | 图容器，默认 60mm；`.short` 50mm、`.mid` 70mm、`.tall` 82mm |

## 排版硬约束

- 页面净高 **1123px**（A4 @96dpi，缩放 1.0）。任何 `.sheet` 超过即打印裂页。
- 填充率目标 **62%–98%**。
- 打印 CSS 已设 `@page{margin:0}` + `.sheet{height:296.6mm; overflow:hidden}`，
  实现屏幕打印 1:1。**不要**把 `.rh`/`.rf` 改成 `position:fixed`——在分页媒体里
  fixed 元素会在每页重复，22 个页眉会全部叠在一起。

### 页面太空怎么办

按优先级，全部基于既有数据，不要注水：

1. 把段落里的计数摊成表（如「在审评 39 条、制证完毕 12 条、片剂 46 条」→ 分面分布表）
2. 把堆叠的名单拆成逐行表，并加一列派生判断（如原料企业是否同时申报制剂）
3. 加一张图表达同一组数据的结构
4. 补一段基于已有数据的观察（如从最新登记日期推断队列仍在扩大）
5. 把长章节拆成两页，让两页各自达到 70% 以上

### 页面超高怎么办

1. 先整体收紧密度：正文 10pt / 行距 1.62、表格 9pt / 内边距 1.6mm
2. 仍超则拆页，在合适的小节边界断开
3. 拆页后**重新编号所有页脚**（脚本会核对 sheet 数与 PDF 页数是否一致）

## ECharts 约定

```js
const c = echarts.init(el, null, { renderer: 'svg' });   // 必须 svg，打印才是矢量
```

固定色板（与 CSS 变量同源）：

```js
const NAVY='#1f3864', BLUE='#2e5496', TEAL='#2f8f7a',
      AMBER='#c8811a', RED='#c00000', GREY='#8b95a5';
const baseFont = { fontFamily:'PingFang SC, Heiti SC, sans-serif', fontSize:11 };
```

必加：

```js
window.addEventListener('resize',     () => charts.forEach(c => c.resize()));
window.addEventListener('beforeprint', () => charts.forEach(c => c.resize()));
```

### 图型选择

| 场景 | 图型 | 要点 |
|---|---|---|
| 竞争强度计数 | 横向 bar，`yAxis.inverse:true` | 类目名长时用横向；`label.position:'right'` 标数值 |
| 分省/多类目分布 | 横向 bar，`.tall` | 按降序排列 |
| 多品种多指标对比 | 纵向分组柱 | 一个 series 一个指标，`legend.bottom:0` |
| 渠道/结构占比 | 堆叠柱 | `stack` 同名；柱内标分项，柱顶用 `formatter` 标合计 |
| 情景打分 | 分组柱 + 折线 | 综合分走折线，用 `markLine` 画通过线 |
| 六维轮廓 | radar `.mid` | `radius:'73%'`；容器低于 60mm 会小到看不清 |
| 时间线 | time 轴 scatter | 见下方避让规则 |

### 时间线标签避让

节点在时间上密集时标签必然互相压字。做法：

```js
yAxis: { type:'value', min:0, max:5.2, show:false },
data: [
  { value:['2024-12-06', 1.0], name:'中国进口上市', label:{ position:'bottom' } },
  { value:['2025-07-08', 2.3], name:'第 93 批参比', label:{ position:'top' } },
  { value:['2025-08-25', 3.6], name:'潜在首仿受理', label:{ position:'top' } },
]
```

- 给每个节点**显式的 y 层级**（1.0 / 2.3 / 3.6），密集簇分散到不同层
- 逐点设 `label.position`（top/bottom 交替）
- `xAxis.min/max` 各留 1–2 年余量，否则首末节点标签被裁掉
- 空窗期等区间用 `markArea`，标签放 `insideBottom` 避开节点标签

## 目录页码

HTML 无法自动算打印页码，但 `.sheet` 与页面 1:1，所以页码是确定的：

1. 先让校验脚本输出各章实测页码（它读每章所在 sheet 的 `.rf` 文本）
2. 回填进目录：`<span class="nm">…</span><span class="dots"></span><span class="pn">7</span>`
3. **任何拆页/合页之后都要重新跑一遍并回填**

## 校验循环

```bash
skills/drug-project-initiation/scripts/audit_pages.sh <报告绝对路径>
```

脚本依次做四件事：量每页高度与填充率、导出 PDF 并数页数、渲染对照图、打印各章页码。

通过标准：

- [ ] `over=0`（无超高页）
- [ ] 无填充率 < 62% 的页
- [ ] PDF 页数 == sheet 数（不相等说明有隐形裂页或空白页）
- [ ] Read 对照图，确认无空白页、无图表标签压字、无表格截断
- [ ] 目录页码与脚本输出一致

单页细节用高分辨率复核：

```bash
pdftoppm -png -r 150 -f 18 -l 18 /tmp/report_audit.pdf /tmp/pg && open /tmp/pg-18.png
```

## 同时要 Word 版

用 `officecli` 技能另出 docx（`officecli load_skill word`）。两份必须同源同值。
docx 侧注意：

- 多系列图表只能在 `add` 时用 `data="A:1,2;B:3,4"` 一次给全，`series{N}` 只能改已存在的系列
- 原生图表不支持 alt 文本，靠图注段落与图内标题承载说明
- 目录是 TOC 字段，需 `set /settings --prop updateFields=true`，页码由 Word 打开时计算
