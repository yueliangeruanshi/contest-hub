# Contest Hub

集中查看 **Codeforces / AtCoder / 洛谷 / 代码源** 四个平台比赛列表的看板。

> **在线 Demo**：<https://yueliangeruanshi.github.io/contest-hub/>（GitHub Pages 静态版，数据为定时快照）
>
> **不想装环境？** 直接下载打包好的发行版：
> **[Releases · v1.0.0](https://github.com/yueliangeruanshi/contest-hub/releases/latest)**
> → `contest-hub-v1.0.0.zip` / `.tar.gz`

## 启动

```bash
cd contest-hub
pip install fastapi uvicorn requests beautifulsoup4
python server.py            # macOS / Linux 也可双击 start.command
```

然后打开 http://127.0.0.1:8777

- Python 依赖：`fastapi` `uvicorn` `requests` `beautifulsoup4`
- 端口：8777（改 `server.py` 末尾 `port=` 即可）

## 功能

| 功能 | 说明 |
| --- | --- |
| 四平台聚合 | 一次拉取 CF / AtCoder / 洛谷 / 代码源，统一时间轴排序 |
| 实时倒计时 | 未开始显示"距离开始"，进行中显示"剩余时间"，每秒刷新 |
| 状态分组 | 正在进行 → 即将开始 → 已结束 |
| 平台筛选 | 顶部彩色 chip 可单独开关任一平台 |
| 关键词搜索 | 匹配比赛名、编号、赛事类型 |
| 跳转原站 | 点击卡片直达对应比赛页面 |
| 数据源自检 | 页脚显示每个平台抓取成功与否及条数 |

## 数据源

| 平台 | 接口 | 备注 |
| --- | --- | --- |
| Codeforces | `codeforces.com/api/contest.list?gym=false` | 官方 API，无需登录；保留未结束 + 近 60 天已结束 |
| AtCoder | **主**：`atcoder.jp/contests/` 官方列表页 | 解析 Active / Upcoming / Daily / Recent 四类表格，覆盖 Weekday Contest（AWC）与全部未来场次 |
| AtCoder | 辅：`kenkoooo.com/atcoder/resources/contests.json` | AtCoder Problems 公开 JSON，补齐官方页未列出的历史场次与 rated 信息；按 id 去重，官方优先 |
| 洛谷 | `luogu.com.cn/contest/list?page=N` | 服务端渲染页面，正则/BS4 解析；带 UA 与 C3VK 挑战 cookie 绕过 CC 防护，抓前 2 页（约 40 场） |
| 代码源 | `bs.daimayuan.top/contest` | Hydro 框架的 SPA，普通 UA 只拿得到空骨架；**改用搜索引擎 UA** 后服务端会返回内嵌 `tdocs` 的完整页面，一条请求即可拿到全部比赛的 `beginAt` / `endAt` / `rated` |

洛谷无公开比赛 API（`/api/contest/list` 已 404），因此采用页面解析；若洛谷改版导致解析失败，页脚会标红提示，此时只需修改 `fetchers.py` 中 `parse_luogu_page()` 的选择器。

代码源同理，若其 Hydro 版本升级后不再内嵌 `tdocs`，页脚会标红，改 `fetch_daimayuan()` 即可。

> 为什么 AtCoder 不能只用 kenkoooo？实测该 JSON 只收录到 `awc0020`，**不含 AtCoder Weekday Contest（AWC）等新赛事，也不含任何未来场次**（如 ABC481 / ARC233 / AGC079 都查不到）。官方列表页才有完整 upcoming，故改为官方为主、kenkoooo 补历史。

## 静态演示版（不需要 Python 后端）

`docs/` 下是一份纯静态演示，读取预先导出的数据快照，可用 GitHub Pages 直接托管。

```bash
python export_snapshot.py        # 重新抓取并生成 docs/data/contests.json
```

启用 Pages：**Settings → Pages → Build and deployment → Deploy from a branch** → 选 `main` 分支 + `/docs` 目录。
倒计时在页面上仍是实时计算的，但比赛数据本身是快照（可用定时任务或 Actions 重新生成）。

本仓库已开启，Demo 地址：<https://yueliangeruanshi.github.io/contest-hub/>

附带两个 GitHub Actions：

| Workflow | 触发 | 作用 |
| --- | --- | --- |
| `update-snapshot.yml` | 每 6 小时 / 手动 / `fetchers.py`、`export_snapshot.py` 变更 | 重新抓取并刷新 `docs/data/contests.json`，Demo 数据自动保鲜 |
| `release.yml` | push `v*` tag / 手动 | 自动打包 zip + tar.gz 并发布 Release |

洛谷对境外 IP 返回 403，所以 CI 里通过 `CONTEST_SKIP=luogu` 跳过它，并沿用上一份快照中的洛谷数据，
避免自动刷新把洛谷比赛覆盖成 0 场。

## 文件结构

```
contest-hub/
├── server.py            # FastAPI：5 分钟内存缓存 + CORS + 静态托管
├── fetchers.py          # 三平台抓取逻辑（仅依赖 requests + beautifulsoup4）
├── export_snapshot.py   # 导出 docs/data/contests.json 静态快照
├── start.command        # 双击启动（自动开浏览器）
├── static/
│   ├── index.html       # 页面骨架
│   ├── style.css        # 苹果风深色毛玻璃样式
│   └── app.js           # 渲染、筛选、倒计时
├── docs/                # GitHub Pages 静态演示（index.html + data/contests.json）
└── README.md
```

## 可调参数

- `server.py` → `CACHE_TTL = 300`：缓存秒数；前端每 5 分钟自动拉取一次，点"刷新"强制更新
- `fetchers.py` → `fetch_luogu(pages=2)`：洛谷抓取页数
- `fetchers.py` → 各平台"已结束"保留窗口：`cutoff = now - 60 天`

## 发布 Release

```bash
python export_snapshot.py
VERSION=v1.0.0
git archive --format=zip   --prefix="contest-hub-$VERSION/" -o "contest-hub-$VERSION.zip"   HEAD
git archive --format=tar.gz --prefix="contest-hub-$VERSION/" -o "contest-hub-$VERSION.tar.gz" HEAD
gh release create $VERSION contest-hub-$VERSION.zip contest-hub-$VERSION.tar.gz \
  --title "Contest Hub $VERSION" --notes-file notes.md
```

> 用 `git archive` 打包只会收录已跟踪文件，不会把 `.git/`、`__pycache__/`、macOS 的 `._*` 元数据混进去。
