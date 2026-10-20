#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Contest Hub - 洛谷 / AtCoder / Codeforces 比赛聚合服务
抓取逻辑见 fetchers.py
"""
import time
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

import fetchers

BASE_DIR = __file__.rsplit("/", 1)[0]
STATIC_DIR = BASE_DIR + "/static"

CACHE_TTL = 300                              # 缓存 5 分钟
_cache: dict[str, Any] = {"ts": 0, "payload": None}


def get_payload(force: bool = False) -> dict:
    if not force and _cache["payload"] and int(time.time()) - _cache["ts"] < CACHE_TTL:
        return _cache["payload"]
    payload = fetchers.build_payload()
    _cache["ts"] = int(time.time())
    _cache["payload"] = payload
    return payload


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
    return {"ok": True, "ts": int(time.time())}


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR + "/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8777, log_level="info")
