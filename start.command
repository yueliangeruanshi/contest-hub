#!/bin/bash
# 双击启动 Contest Hub（macOS / Linux）
cd "$(dirname "$0")" || exit 1

# 优先使用项目自带的虚拟环境
if [ -x ".venv/bin/python" ]; then
  PY=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY=python3
else
  PY=python
fi

echo "使用解释器: $PY"
echo "启动 Contest Hub -> http://127.0.0.1:8777"
open "http://127.0.0.1:8777" 2>/dev/null || true
exec "$PY" server.py
