#!/bin/bash
cd "$(dirname "$0")"
PY=/Users/ryh/.workbuddy/binaries/python/envs/default/bin/python
if [ ! -x "$PY" ]; then PY=$(command -v python3); fi
echo "启动 Contest Hub ..."
open "http://127.0.0.1:8777" 2>/dev/null
exec "$PY" server.py
