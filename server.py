#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Contest Hub - 洛谷 / AtCoder / Codeforces 比赛聚合服务
数据源:
  - Codeforces : https://codeforces.com/api/contest.list  (官方 API)
  - AtCoder    : https://kenkoooo.com/atcoder/resources/contests.json (AtCoder Problems)
  - 洛谷        : https://www.luogu.com.cn/contest/list (SSR 页面解析)
"""
import re
import time
import html as html_lib
from datetime import datetime, timezone, timedelta
from typing import Any

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

BASE_DIR = __file__.rsplit("/", 1)[0]
STATIC_DIR = BASE_DIR + "/static"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

CST = timezone(timedelta(hours=8))          # 北京时间
CACHE_TTL = 300                              # 缓存 5 分钟
_cache: dict[str, Any] = {"ts": 0, "payload": None}

# ---------------------------------------------------------------- 工具

def now_ts() -> int:
    return int(time.time())


def status_of(start: int, end: int) -> str:
    n = now_ts()
    if n < start:
        return "upcoming"
    if n < end:
        return "running"
    return "finished"


def luogu_time_to_ts(text: str) -> int:
    """'2026-10-29 13:00:00' (北京时间) -> unix 秒"""
    try:
        dt = datetime.strptime(text.strip(), "%Y-%m-%d %H:%M:%S").replace(tzinfo=CST)
        return int(dt.timestamp())
    except Exception:
        return 0


# ---------------------------------------------------------------- Codeforces

CF_TYPE_CN = {
    "CF": "Codeforces", "ICPC": "ICPC", "IOI": "IOI",
    "Div1": "Div.1", "Div2": "Div.2", "Div3": "Div.3", "Div4": "Div.4",
    "Educational": "Educational", "Global": "Global Round",
    "Kotlin": "Kotlin", "Unknown": "其他",
}


def cf_kind(name: str, ctype: str) -> str:
    n = name.upper()
    m = re.search(r"DIV\.?\s*([1-4])", n)
    if m:
        return "Div." + m.group(1)
    for kw, label in [
        ("EDUCATIONAL", "Educational"), ("GLOBAL ROUND", "Global"),
        ("KOTLIN", "Kotlin"), ("UNIVERSAL", "Universal"),
        ("HELLO", "Hello"), ("GOOD BYE", "Good Bye"),
        ("ICPC", "ICPC"), ("IOI", "IOI"), ("MARATHON", "Marathon"),
    ]:
        if kw in n:
            return label
    return CF_TYPE_CN.get(ctype, ctype or "其他")


def fetch_codeforces() -> tuple[list[dict], str | None]:
    url = "https://codeforces.com/api/contest.list?gym=false"
    r = requests.get(url, timeout=20, headers={"User-Agent": UA})
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "OK":
        raise RuntimeError("CF API: " + str(data.get("comment", "unknown error")))

    out = []
    cutoff = now_ts() - 60 * 24 * 3600      # 已结束的只保留 60 天内
    for c in data.get("result", []):
        start = c.get("startTimeSeconds") or 0
        if not start:
            continue
        dur = c.get("durationSeconds") or 0
        end = start + dur
        finished = (c.get("phase") == "FINISHED") or (end < now_ts())
        if finished and end < cutoff:
            continue
        out.append({
            "platform": "codeforces",
            "platform_cn": "Codeforces",
            "id": str(c.get("id")),
            "name": c.get("name", ""),
            "url": "https://codeforces.com/contest/%s" % c.get("id"),
            "start": start,
            "end": end,
            "duration": dur,
            "type": cf_kind(c.get("name", ""), c.get("type", "")),
            "status": status_of(start, end),
        })
    return out, None


# ---------------------------------------------------------------- AtCoder

AC_ID_PREFIX = [
    ("abc", "ABC"), ("arc", "ARC"), ("agc", "AGC"), ("ahc", "AHC"),
    ("awc", "AWC"), ("aal", "AAL"), ("apg", "APG"), ("abc", "ABC"),
]


def atcoder_kind(title: str, cid: str) -> str:
    low = cid.lower()
    for pre, label in AC_ID_PREFIX:
        if re.match(r"^%s\d+" % pre, low):
            return label
    t = title.upper()
    for kw, label in [
        ("WEEKDAY", "AWC"), ("BEGINNER", "ABC"), ("REGULAR", "ARC"),
        ("GRAND", "AGC"), ("HEURISTIC", "AHC"), ("MARATHON", "Marathon"),
        ("JAPAN ALUMNI", "JAG"), ("SEGTREE", "AAL"),
    ]:
        if kw in t:
            return label
    return "其他"


def ac_parse_time(text: str) -> int:
    """'2026-10-20 20:00:00+0900' -> unix 秒"""
    try:
        return int(datetime.strptime(text.strip(), "%Y-%m-%d %H:%M:%S%z").timestamp())
    except Exception:
        return 0


def ac_parse_dur(text: str) -> int:
    """'01:40' / '240:00' -> 秒"""
    try:
        h, m = text.strip().split(":")
        return int(h) * 3600 + int(m) * 60
    except Exception:
        return 0


def ac_clean_title(text: str) -> str:
    return html_lib.unescape(re.sub(r"^[\sⒶⒽ◉]+", "", text).strip())


AC_TABLES = ["contest-table-active", "contest-table-upcoming",
             "contest-table-daily", "contest-table-recent"]


def fetch_atcoder_official() -> list[dict]:
    """抓取 atcoder.jp/contests 官方列表页（含 Weekday Contest 与全部未来场次）。"""
    r = requests.get("https://atcoder.jp/contests/", timeout=25,
                     headers={"User-Agent": UA, "Accept-Language": "en,ja;q=0.8"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    out, seen = [], set()
    for did in AC_TABLES:
        box = soup.find("div", id=did)
        if not box:
            continue
        for tr in box.select("tbody tr"):
            a = tr.select_one('a[href^="/contests/"]')
            if not a:
                continue
            cid = a["href"].rsplit("/", 1)[-1]
            if cid in seen:
                continue
            tds = [td.get_text(strip=True) for td in tr.select("td")]
            if len(tds) < 3 or not tds[0][:4].isdigit():
                continue                                   # 永久赛 / 无时间行
            start = ac_parse_time(tds[0])
            dur = ac_parse_dur(tds[2])
            if not start or not dur:
                continue
            rng = tds[3] if len(tds) > 3 else ""
            seen.add(cid)
            out.append({
                "platform": "atcoder",
                "platform_cn": "AtCoder",
                "id": cid,
                "name": ac_clean_title(a.get_text(strip=True)),
                "url": "https://atcoder.jp/contests/%s" % cid,
                "start": start,
                "end": start + dur,
                "duration": dur,
                "type": atcoder_kind(a.get_text(strip=True), cid),
                "rated": bool(rng) and rng not in ("-", "All"),
                "status": status_of(start, start + dur),
            })
    if not out:
        raise RuntimeError("AtCoder 官方页面解析为空")
    return out


def fetch_atcoder_legacy() -> list[dict]:
    """kenkoooo/AtCoder Problems 的 JSON，用于补充历史场次与 rated 信息。"""
    url = "https://kenkoooo.com/atcoder/resources/contests.json"
    r = requests.get(url, timeout=25, headers={"User-Agent": UA})
    r.raise_for_status()
    data = r.json()

    out = []
    cutoff = now_ts() - 60 * 24 * 3600
    for c in data:
        start = c.get("start_epoch_second") or 0
        dur = c.get("duration_second") or 0
        if start <= 0 or dur <= 0 or dur > 40 * 24 * 3600:
            continue                                  # 过滤永久赛 (start=0 / 100 年)
        end = start + dur
        if end < cutoff:
            continue
        out.append({
            "platform": "atcoder",
            "platform_cn": "AtCoder",
            "id": c.get("id", ""),
            "name": c.get("title", ""),
            "url": "https://atcoder.jp/contests/%s" % c.get("id"),
            "start": start,
            "end": end,
            "duration": dur,
            "type": atcoder_kind(c.get("title", ""), c.get("id", "")),
            "rated": (c.get("rate_change") or "-") != "-",
            "status": status_of(start, end),
        })
    past = sorted([x for x in out if x["status"] == "finished"],
                  key=lambda x: -x["start"])[:40]
    future = [x for x in out if x["status"] != "finished"]
    return future + past


def fetch_atcoder() -> tuple[list[dict], str | None]:
    """官方页面为主（覆盖 Weekday Contest 与未来场次），kenkoooo 补历史。"""
    official, legacy = [], []
    errs = []
    try:
        official = fetch_atcoder_official()
    except Exception as e:
        errs.append("official: %s" % e)
    try:
        legacy = fetch_atcoder_legacy()
    except Exception as e:
        errs.append("kenkoooo: %s" % e)
    if not official and not legacy:
        raise RuntimeError("；".join(errs) or "AtCoder 数据获取失败")

    merged: dict[str, dict] = {}
    for c in legacy:
        merged[c["id"]] = c
    for c in official:                       # 官方数据更新更及时，优先覆盖
        merged[c["id"]] = c

    out = list(merged.values())
    out.sort(key=lambda c: c["start"])
    return out, ("；".join(errs) if errs else None)


# ---------------------------------------------------------------- 洛谷

def luogu_session() -> requests.Session:
    """洛谷有 CC 防护: 首次请求 302 并下发 C3VK, 带 cookie 重试即可。"""
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": "https://www.luogu.com.cn/contest/list",
    })
    try:
        s.get("https://www.luogu.com.cn/contest/list", timeout=15,
              allow_redirects=False)              # 拿 C3VK / __client_id
    except Exception:
        pass
    return s


def parse_luogu_page(html_text: str) -> list[dict]:
    soup = BeautifulSoup(html_text, "html.parser")
    out = []
    for li in soup.select("li"):
        a = li.select_one('h3 a[href^="/contest/"]')
        if not a:
            continue
        cid = a["href"].rsplit("/", 1)[-1]
        name = html_lib.unescape(a.get_text(strip=True))
        small = li.select_one("p small")
        if not small:
            continue
        txt = small.get_text(strip=True)
        if "~" not in txt:
            continue
        s_part, e_part = txt.split("~", 1)
        start = luogu_time_to_ts(s_part)
        end = luogu_time_to_ts(e_part)
        if not start or not end or end <= start:
            continue
        kind = "官方赛" if ("月赛" in name or "LGR" in name or "SCP" in name or "NOIP" in name or "CSP" in name) else "公开赛"
        if "入门赛" in name:
            kind = "入门赛"
        elif "基础赛" in name:
            kind = "基础赛"
        elif "提高赛" in name:
            kind = "提高赛"
        elif "重现赛" in name or "重现" in name:
            kind = "重现赛"
        elif "模拟" in name:
            kind = "模拟赛"
        out.append({
            "platform": "luogu",
            "platform_cn": "洛谷",
            "id": cid,
            "name": name,
            "url": "https://www.luogu.com.cn/contest/%s" % cid,
            "start": start,
            "end": end,
            "duration": end - start,
            "type": kind,
            "status": status_of(start, end),
        })
    return out


def fetch_luogu(pages: int = 2) -> tuple[list[dict], str | None]:
    s = luogu_session()
    all_items: list[dict] = []
    seen = set()
    for p in range(1, pages + 1):
        url = "https://www.luogu.com.cn/contest/list?page=%d" % p
        try:
            r = s.get(url, timeout=20, allow_redirects=False)
            if r.status_code in (301, 302, 303, 307, 308):   # WAF 挑战, 再试一次
                r = s.get(url, timeout=20, allow_redirects=True)
            r.raise_for_status()
        except Exception:
            if p == 1:
                raise
            break
        items = parse_luogu_page(r.text)
        if not items:
            break
        for it in items:
            if it["id"] not in seen:
                seen.add(it["id"])
                all_items.append(it)
        time.sleep(0.4)
    if not all_items:
        raise RuntimeError("洛谷页面解析为空（可能触发风控）")
    return all_items, None


# ---------------------------------------------------------------- 聚合

FETCHERS = {
    "codeforces": fetch_codeforces,
    "atcoder": fetch_atcoder,
    "luogu": fetch_luogu,
}


def build_payload() -> dict:
    contests: list[dict] = []
    sources = {}
    for key, fn in FETCHERS.items():
        try:
            items, err = fn()
            sources[key] = {"ok": True, "count": len(items), "error": err}
            contests.extend(items)
        except Exception as e:
            sources[key] = {"ok": False, "count": 0, "error": "%s" % e}
    contests.sort(key=lambda c: (c["start"], c["platform"]))
    return {
        "updated_at": now_ts(),
        "sources": sources,
        "count": len(contests),
        "contests": contests,
    }


def get_payload(force: bool = False) -> dict:
    if not force and _cache["payload"] and now_ts() - _cache["ts"] < CACHE_TTL:
        return _cache["payload"]
    payload = build_payload()
    _cache["ts"] = now_ts()
    _cache["payload"] = payload
    return payload


# ---------------------------------------------------------------- API

app = FastAPI(title="Contest Hub")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/contests")
def api_contests(refresh: int = 0):
    try:
        return JSONResponse(get_payload(force=bool(refresh)))
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/health")
def api_health():
    return {"ok": True, "ts": now_ts()}


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR + "/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8777, log_level="info")
