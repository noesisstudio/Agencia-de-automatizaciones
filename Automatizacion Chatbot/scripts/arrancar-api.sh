#!/bin/bash
# Arranca solo la API + panel (sin ngrok ni publicar).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/chatbot-backend"
PORT="${CHATBOT_PORT:-8000}"
PID_FILE="$BACKEND/logs/uvicorn.pid"

mkdir -p "$BACKEND/logs"

kill_port() {
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "Deteniendo proceso(s) en puerto $PORT..."
    kill $pids 2>/dev/null || true
    sleep 1
  fi
}

cd "$BACKEND"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -q -r requirements.txt
else
  source .venv/bin/activate
fi

kill_port

echo "Iniciando uvicorn en http://127.0.0.1:${PORT} ..."
nohup .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port "$PORT" >>logs/uvicorn.log 2>&1 &
echo $! >"$PID_FILE"

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo ""
    echo "Listo:"
    echo "  Panel:  http://127.0.0.1:${PORT}/panel/clientes.html"
    echo "  Salud:  http://127.0.0.1:${PORT}/health"
    exit 0
  fi
  sleep 1
done

echo "ERROR: la API no respondió. Últimas líneas del log:"
tail -n 15 logs/uvicorn.log 2>/dev/null || true
exit 1
