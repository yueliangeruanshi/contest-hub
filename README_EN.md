# Contest Hub

[English](README_EN.md) | [简体中文](README.md)

A single dashboard for contests on **Codeforces, AtCoder, Luogu and Daimayuan**.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

> **Live demo**: <https://yueliangeruanshi.github.io/contest-hub/> (GitHub Pages, data refreshed automatically)
>
> Prefer not to install anything? Download a bundled build:
> **[Latest release](https://github.com/yueliangeruanshi/contest-hub/releases/latest)**
> → `contest-hub-vX.Y.Z.zip` / `.tar.gz`

## Quick start

```bash
cd contest-hub
pip install fastapi uvicorn requests beautifulsoup4
python server.py            # on macOS / Linux you can also double-click start.command
```

Then open <http://127.0.0.1:8777>.

- Dependencies: `fastapi` `uvicorn` `requests` `beautifulsoup4`
- Port: 8777 (change `port=` at the bottom of `server.py`)

## Features

| Feature | Description |
| --- | --- |
| 4 platforms in one list | Codeforces / AtCoder / Luogu / Daimayuan, sorted on a single timeline |
| Live countdown | "Time until start" for upcoming, "Time left" for running, refreshed every second |
| Status grouping | Running → Upcoming → Finished |
| Platform filter | Colored chips at the top toggle each platform independently |
| Keyword search | Matches contest name, ID and contest type |
| Jump to source | Click a card to open the original contest page |
| Source self-check | The footer shows fetch status and contest count per platform |

## Data sources

| Platform | Endpoint | Notes |
| --- | --- | --- |
| Codeforces | `codeforces.com/api/contest.list?gym=false` | Official API, no login needed; keeps unfinished contests plus finished ones from the last 60 days |
| AtCoder | **primary**: `atcoder.jp/contests/` | Parses the Active / Upcoming / Daily / Recent tables, so it covers Weekday Contests (AWC) and every upcoming contest |
| AtCoder | secondary: `kenkoooo.com/atcoder/resources/contests.json` | AtCoder Problems JSON; fills in historical contests missing from the official page and adds rating info. Merged by ID, official page wins |
| Luogu | `luogu.com.cn/contest/list?page=N` | Server-rendered page parsed with regex/BS4; uses a UA plus the C3VK challenge cookie to get past CC protection. First 2 pages (~40 contests) |
| Daimayuan | `bs.daimayuan.top/contest` | A Hydro SPA. A normal UA only gets an empty shell; **with a search-engine UA** the server returns a page with embedded `tdocs`, so one request yields `beginAt` / `endAt` / `rated` for every contest |

Luogu exposes no public contest API (`/api/contest/list` returns 404), so the page is parsed instead. If Luogu changes its markup the fetch fails, the footer turns red, and you only need to update the selectors in `parse_luogu_page()` (`fetchers.py`).

The same applies to Daimayuan: if a Hydro upgrade stops embedding `tdocs`, the footer turns red and `fetch_daimayuan()` is the place to fix.

> Why can't AtCoder rely on kenkoooo alone? That JSON stops at `awc0020` — it has **no Weekday Contests (AWC) and no upcoming contests at all** (ABC481 / ARC233 / AGC079 are all missing from it). Only the official page lists the full upcoming schedule, so it is the primary source with kenkoooo filling in history.

## Static demo (no Python backend)

`docs/` is a fully static demo that reads a pre-exported data snapshot and can be hosted directly on GitHub Pages.

```bash
python export_snapshot.py        # re-fetch and regenerate docs/data/contests.json
```

To enable Pages: **Settings → Pages → Build and deployment → Deploy from a branch** → branch `main`, folder `/docs`.
Countdowns are still computed live in the browser, but the contest list itself is a snapshot.

This repo already has it enabled: <https://yueliangeruanshi.github.io/contest-hub/>

Two GitHub Actions come with it:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `update-snapshot.yml` | every 6 hours / manual / changes to `fetchers.py` or `export_snapshot.py` | Re-fetches and refreshes `docs/data/contests.json`, keeping the demo data fresh |
| `release.yml` | push a `v*` tag / manual | Packages zip + tar.gz and publishes a Release |

Luogu returns 403 to non-Chinese IPs, so CI skips it via `CONTEST_SKIP=luogu` and reuses the Luogu entries from the previous snapshot — otherwise an automatic refresh would wipe them down to 0.

## Project layout

```
contest-hub/
├── server.py            # FastAPI: 5-minute in-memory cache + CORS + static hosting
├── fetchers.py          # fetchers for all four platforms (only needs requests + beautifulsoup4)
├── export_snapshot.py   # writes the docs/data/contests.json snapshot
├── start.command        # one-click launcher (opens the browser)
├── static/
│   ├── index.html       # page skeleton
│   ├── style.css        # dark frosted-glass Apple-style theme
│   └── app.js           # rendering, filtering, countdown
├── docs/                # GitHub Pages demo (index.html + data/contests.json)
├── .github/workflows/   # release.yml, update-snapshot.yml
├── README.md            # 简体中文
├── README_EN.md         # English
└── LICENSE
```

## Tunables

- `server.py` → `CACHE_TTL = 300`: cache duration in seconds. The frontend re-fetches every 5 minutes; the "Refresh" button forces an update
- `fetchers.py` → `fetch_luogu(pages=2)`: how many Luogu pages to fetch
- `fetchers.py` → retention window for finished contests: `cutoff = now - 60 days`

## Cutting a release

```bash
python export_snapshot.py
VERSION=v1.0.0
git archive --format=zip    --prefix="contest-hub-$VERSION/" -o "contest-hub-$VERSION.zip"    HEAD
git archive --format=tar.gz --prefix="contest-hub-$VERSION/" -o "contest-hub-$VERSION.tar.gz" HEAD
gh release create $VERSION contest-hub-$VERSION.zip contest-hub-$VERSION.tar.gz \
  --title "Contest Hub $VERSION" --notes-file notes.md
```

> `git archive` only includes tracked files, so `.git/`, `__pycache__/` and the macOS `._*` metadata files never end up in the archive.
> In practice just push a tag — the Actions workflow does all of this for you.

## License

[MIT](LICENSE) — use, modify and distribute freely, as long as the copyright notice is kept.
