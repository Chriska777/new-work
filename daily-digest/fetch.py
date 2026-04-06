"""
每日资讯简报
数据来源：本地 DailyHotApi (http://localhost:6688)
运行前请先启动 DailyHotApi：cd D:/DailyHotApi && npm start
运行：python fetch.py  →  生成 report.html
"""

import json, os, datetime, ssl
import urllib.request

API = "http://localhost:6688"

# ── 要抓取的来源（path, 显示名, 颜色）────────────────────────
SOURCES = [
    ("baidu",        "百度热搜",   "#2932e1"),
    ("bilibili",     "B站热门",    "#fb7299"),
    ("netease-news", "网易新闻",   "#c0392b"),
    ("qq-news",      "腾讯新闻",   "#1677ff"),
    ("csdn",         "CSDN",       "#fc5531"),
    ("hellogithub",  "HelloGitHub","#24292e"),
    ("weread",       "微信读书",   "#07c160"),
    ("gameres",      "游资网",     "#f39c12"),
]

LIMIT = 15  # 每个来源取前 N 条

def fetch_source(path):
    url = f"{API}/{path}?limit={LIMIT}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        d = json.loads(r.read())
    if d.get("code") != 200:
        return []
    return d.get("data", [])[:LIMIT]

# ── HTML 生成 ─────────────────────────────────────────────────
def build_html(sections, date_str):
    cards = ""
    for src_name, color, items in sections:
        rows = ""
        for i, item in enumerate(items, 1):
            title = item.get("title", "").replace("<", "&lt;").replace(">", "&gt;")
            desc  = item.get("desc", "")
            url   = item.get("url") or item.get("mobileUrl", "#")
            extra = f'<span class="desc">{desc[:40]}</span>' if desc and desc != title else ""
            rows += f"""
            <li>
              <span class="idx">{i}</span>
              <span class="content">
                <a href="{url}" target="_blank" rel="noopener">{title}</a>
                {extra}
              </span>
              <span class="tag" style="background:{color}">{src_name}</span>
            </li>"""
        cards += f"""
        <div class="card">
          <div class="card-header" style="border-left:4px solid {color}">
            <span style="color:{color}">●</span> {src_name}
            <span class="count">{len(items)} 条</span>
          </div>
          <ul>{rows}</ul>
        </div>"""

    source_list = " / ".join(s for s, _, __ in sections)
    return f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>每日简报 · {date_str}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Microsoft YaHei',Arial,sans-serif;background:#f4f6fa;color:#333;padding:24px}}
h1{{font-size:28px;font-weight:900;color:#222;margin-bottom:4px}}
.sub{{color:#999;font-size:13px;margin-bottom:24px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:20px}}
.card{{background:#fff;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.07)}}
.card-header{{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;
  padding-left:10px;margin-bottom:14px;color:#333}}
.count{{margin-left:auto;font-size:12px;color:#bbb;font-weight:400}}
ul{{list-style:none}}
li{{display:flex;align-items:flex-start;gap:8px;padding:7px 0;
    border-bottom:1px solid #f0f0f0;font-size:13px;line-height:1.5}}
li:last-child{{border-bottom:none}}
.idx{{min-width:18px;color:#ccc;font-size:11px;padding-top:3px;flex-shrink:0}}
.content{{flex:1;display:flex;flex-direction:column;gap:2px}}
a{{color:#333;text-decoration:none}}
a:hover{{color:#1890ff}}
.desc{{font-size:11px;color:#aaa}}
.tag{{font-size:10px;color:#fff;border-radius:3px;padding:2px 6px;
      white-space:nowrap;flex-shrink:0;margin-top:2px}}
</style>
</head>
<body>
<h1>每日资讯简报</h1>
<p class="sub">生成时间：{date_str} · 来源：{source_list}</p>
<div class="grid">{cards}</div>
</body>
</html>"""

# ── 主程序 ────────────────────────────────────────────────────
def main():
    print("正在从 DailyHotApi 拉取数据...\n")
    sections = []
    for path, name, color in SOURCES:
        print(f"  [{name}]", end=" ", flush=True)
        try:
            items = fetch_source(path)
            print(f"{len(items)} 条")
            if items:
                sections.append((name, color, items))
        except Exception as e:
            print(f"失败 - {e}")

    if not sections:
        print("\n所有来源抓取失败，请确认 DailyHotApi 已启动：")
        print("  cd D:/DailyHotApi && npm start")
        return

    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    html = build_html(sections, date_str)

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    total = sum(len(i) for _, __, i in sections)
    print(f"\n完成！共 {total} 条资讯 → {out}")

if __name__ == "__main__":
    main()
