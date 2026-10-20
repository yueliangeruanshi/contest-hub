#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导出比赛数据快照到 docs/data/contests.json，供 GitHub Pages 静态演示使用。
本地用法:  python export_snapshot.py
GitHub Actions 会定时执行这个脚本并提交更新。
"""
import json
import os
import time
from datetime import datetime, timezone, timedelta

import fetchers

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "docs", "data")
OUT_FILE = os.path.join(OUT_DIR, "contests.json")

CST = timezone(timedelta(hours=8))


def main() -> int:
    payload = fetchers.build_payload()
    payload["generated_at_str"] = datetime.now(CST).strftime("%Y-%m-%d %H:%M:%S (UTC+8)")
    payload["snapshot"] = True

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    print("已写入 %s" % OUT_FILE)
    for k, v in payload["sources"].items():
        flag = "OK " if v["ok"] else "ERR"
        print("  [%s] %-11s %3d 场 %s" % (flag, k, v["count"], v["error"] or ""))
    print("  合计 %d 场，生成时间 %s" % (payload["count"], payload["generated_at_str"]))

    failed = [k for k, v in payload["sources"].items() if not v["ok"]]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
