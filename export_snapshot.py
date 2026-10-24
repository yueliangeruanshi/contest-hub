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
    failed = []
    for k, v in payload["sources"].items():
        if v["ok"]:
            print("  [OK ] %-11s %3d 场" % (k, v["count"]))
        else:
            failed.append(k)
            print("  [ERR] %-11s %3d 场 %s" % (k, v["count"], v["error"] or ""))
    print("  合计 %d 场，生成时间 %s" % (payload["count"], payload["generated_at_str"]))

    # 单个平台失败（例如洛谷对境外 IP 返回 403）不算失败，全部失败才报错
    if failed and len(failed) == len(payload["sources"]):
        print("  所有平台均抓取失败")
        return 1
    if failed:
        print("  部分平台失败：%s（快照仍会保留其余平台）" % "、".join(failed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
