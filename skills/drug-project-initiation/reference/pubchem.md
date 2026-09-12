# PubChem 化学信息与结构式

结构式与物化标识一律走 **PubChem PUG-REST**（NCBI）。PubMed 是文献库，不含标准结构图，不要用它填化学字段。

## 必跑脚本

```bash
python3 skills/drug-project-initiation/scripts/fetch_chem_info.py Dotinurad \
  --out-dir reports/_chem/dotinurad
```

产出：

| 文件 | 内容 |
|---|---|
| `chem_info.json` | CID、CAS、分子式、分子量、IUPAC、SMILES、InChI/Key、XLogP、TPSA、HBD/HBA 等 |
| `structure.png` | 2D 结构式（默认 500×500） |

中文通用名常查不到。优先用 **英文 INN**；仍失败时用 DrugSea/`targets` 或说明书里的英文名，或直接 `--cid`。

```bash
# 已知 CID 时跳过名称解析
python3 .../fetch_chem_info.py --cid 73759542 --out-dir reports/_chem/dotinurad
```

## 写进报告哪里

放在 **第三章「品种基础档案」**（或第一章背景后的化学身份小节）：

1. 左侧 / 上方：`<img class="struct" src="…/structure.png">`（相对 HTML 的路径）
2. 右侧 / 下方：表「化学标识」——CID、CAS、分子式、分子量、IUPAC、InChIKey、Canonical SMILES
3. 可选第二表「物化描述符」——XLogP、TPSA、HBD/HBA、可旋转键、重原子数（支撑 CMC/BCS 讨论，不单独打分）
4. `p.src` 注明：`来源：PubChem CID {n}，检索日 YYYY-MM-DD，https://pubchem.ncbi.nlm.nih.gov/compound/{n}`

参考文献中单独一条引用 PubChem，不要混进 DrugSea 列表。

## 纪律

- **照录 JSON，不手改分子式/SMILES。** 与 DrugSea 字段冲突时：结构与分子标识以 PubChem 为准，文号/商品名以 DrugSea 为准，冲突写入数据局限。
- CAS 从 synonyms 中按 `^\d{2,7}-\d{2}-\d$` 抽取；抽不到就标「不可得」，不要猜。
- 限流：脚本已按 ≥0.25 s/请求节流；遇 503/429 会重试。不要并行狂打同一 IP。
- 结构图用 PNG 嵌入即可（打印清晰）；不要手绘或用 AI 生成结构式替代。
- `reports/_chem/` 属本地缓存，已被 `reports/` gitignore；勿提交。

## API 备忘（脚本已封装）

```
GET /rest/pug/compound/name/{name}/cids/TXT
GET /rest/pug/compound/cid/{cid}/property/{props}/JSON
GET /rest/pug/compound/cid/{cid}/synonyms/JSON
GET /rest/pug/compound/cid/{cid}/record/PNG?image_size=500x500
```

官方文档：https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
