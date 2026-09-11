#!/usr/bin/env bash
# 立项报告 HTML 分页审计
#
# 用法：audit_pages.sh <报告绝对路径> [输出目录]
#
# 依次输出：
#   1. 每页高度与填充率（超高 / 低填充标记）
#   2. PDF 实际页数（必须等于 sheet 数）
#   3. 各章实测页码（回填目录 .pn 用）
#   4. 全文对照图路径（用 Read 查看）
#
# 依赖：browser-harness、pdftoppm、python3 + Pillow
set -euo pipefail

F="${1:-}"
OUT="${2:-/tmp/report_audit}"
LIMIT=1123      # A4 @96dpi 净高，超出即打印裂页
MINFILL=62      # 填充率下限

if [ -z "$F" ] || [ ! -f "$F" ]; then
  echo "用法: $0 <报告绝对路径> [输出目录]" >&2
  exit 1
fi
case "$F" in /*) ;; *) F="$(cd "$(dirname "$F")" && pwd)/$(basename "$F")" ;; esac

mkdir -p "$OUT"
URL="file://$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$F")"
PDF="$OUT/report.pdf"

browser-harness <<PY
import base64, json

new_tab("$URL"); wait_for_load(); wait(1.5)
cdp("Emulation.setDeviceMetricsOverride", width=860, height=1180, deviceScaleFactor=2, mobile=False)
wait(0.8)

sheets = json.loads(js("""
JSON.stringify([...document.querySelectorAll('.sheet')].map((s,i)=>{
  const r = s.getBoundingClientRect(), top = r.top;
  const kids = [...s.children].filter(e=>!e.classList.contains('rh') && !e.classList.contains('rf'));
  const last = kids[kids.length-1];
  const padTop = 18*3.7795, usable = 1123 - padTop - 14*3.7795;
  return {
    i:i+1,
    h:Math.round(r.height),
    fill:Math.round(100*((last?last.getBoundingClientRect().bottom:top)-top-padTop)/usable),
    pg:(s.querySelector('.rf')?.textContent||'').replace(/[^0-9]/g,''),
    ch:(s.querySelector('h3.ch')?.textContent||'').trim(),
    x:Math.round(r.left+window.scrollX), y:Math.round(r.top+window.scrollY), w:Math.round(r.width)
  };
}))
"""))

over = [s for s in sheets if s["h"] > $LIMIT]
low  = [s for s in sheets if s["fill"] < $MINFILL]

print("── 分页审计 " + "─"*46)
for s in sheets:
    flag = "OVER" if s["h"] > $LIMIT else ("LOW " if s["fill"] < $MINFILL else "    ")
    pg = ("第%s页" % s["pg"]) if s["pg"] else "无页码"
    print("%s  sheet %2d  h=%5d  fill=%3d%%  %-8s %s" % (flag, s["i"], s["h"], s["fill"], pg, s["ch"]))

print("")
print("sheet 数 = %d   超高 = %d   低填充(<$MINFILL%%) = %d" % (len(sheets), len(over), len(low)))
if over: print("  超高页: " + ", ".join(str(s["i"]) for s in over) + "  → 拆页或收紧密度")
if low:  print("  低填充页: " + ", ".join("%d(%d%%)" % (s["i"], s["fill"]) for s in low) + "  → 用真实数据补内容")

# 打印导出：验证实际分页
pdf = cdp("Page.printToPDF", printBackground=True, preferCSSPageSize=True,
          marginTop=0, marginBottom=0, marginLeft=0, marginRight=0)
open("$PDF", "wb").write(base64.b64decode(pdf["data"]))

# 逐页截图，供拼对照图
for s in sheets:
    shot = cdp("Page.captureScreenshot", format="png", captureBeyondViewport=True,
               clip={"x":s["x"], "y":s["y"], "width":s["w"], "height":s["h"], "scale":1.5})
    open("$OUT/p%02d.png" % s["i"], "wb").write(base64.b64decode(shot["data"]))

print("")
print("── 各章实测页码（回填目录 .pn） " + "─"*20)
for s in sheets:
    if s["ch"]:
        print("  第 %-3s 页   %s" % (s["pg"] or "?", s["ch"]))

json.dump({"sheets": len(sheets), "over": len(over), "low": len(low)}, open("$OUT/summary.json","w"))
PY

SHEETS=$(python3 -c "import json;print(json.load(open('$OUT/summary.json'))['sheets'])")
PAGES=$(python3 - "$PDF" <<'PY'
import re, sys
print(len(re.findall(rb'/Type\s*/Page[^s]', open(sys.argv[1], 'rb').read())))
PY
)

echo ""
echo "── 打印验证 ──────────────────────────────────────────"
echo "  PDF 页数 = $PAGES   sheet 数 = $SHEETS"
if [ "$PAGES" != "$SHEETS" ]; then
  echo "  不一致：存在隐形裂页或空白页，检查超高页与 @page 设置"
else
  echo "  一致：屏幕与打印 1:1"
fi

rm -f "$OUT"/pg-*.png
pdftoppm -png -r 72 "$PDF" "$OUT/pg" 2>/dev/null || true

python3 - "$OUT" <<'PY'
import glob, sys, os
try:
    from PIL import Image
except ImportError:
    print("  (未安装 Pillow，跳过对照图；可单看 %s/p01.png)" % sys.argv[1]); raise SystemExit
out = sys.argv[1]
fs = sorted(glob.glob(os.path.join(out, "pg-*.png"))) or sorted(glob.glob(os.path.join(out, "p*.png")))
if not fs:
    print("  (无可用页面图)"); raise SystemExit
ims = [Image.open(f) for f in fs]
cols = 6
rows = (len(ims) + cols - 1) // cols
w, h = ims[0].size
if w > 620:
    sc = 620 / w; w, h = int(w*sc), int(h*sc)
    ims = [im.resize((w, h), Image.LANCZOS) for im in ims]
g = Image.new("RGB", (cols*w + (cols+1)*6, rows*h + (rows+1)*6), (120, 126, 136))
for i, im in enumerate(ims):
    r, c = divmod(i, cols)
    g.paste(im, (6 + c*(w+6), 6 + r*(h+6)))
p = os.path.join(out, "contact_sheet.png")
g.save(p)
print("")
print("── 对照图（用 Read 查看）──────────────────────────")
print("  " + p)
PY
