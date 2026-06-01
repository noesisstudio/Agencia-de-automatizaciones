#!/bin/bash
# Arranca todos los servicios locales de Openix (APIs + web estática).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_PORT="${OPENIX_WEB_PORT:-8080}"
WEB_PID="$ROOT/Pagina web/.openix-web.pid"

log() { echo "[openix] $*"; }

start_web() {
  mkdir -p "$(dirname "$WEB_PID")"
  local pids
  pids="$(lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    log "Deteniendo servidor web en puerto $WEB_PORT..."
    kill $pids 2>/dev/null || true
    sleep 1
  fi
  cd "$ROOT/Pagina web"
  nohup python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 >>"$ROOT/Pagina web/.openix-web.log" 2>&1 &
  echo $! >"$WEB_PID"
  log "Web: http://127.0.0.1:${WEB_PORT}/index.html"
}

start_facturas() {
  local backend="$ROOT/Automatizacion Facturas/backend"
  local port=8010
  cd "$backend"
  if [ ! -d .venv ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
  else
    source .venv/bin/activate
  fi
  [ -f .env ] || cp .env.example .env
  mkdir -p logs data storage/invoices
  local pids
  pids="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)"
  [ -n "$pids" ] && kill $pids 2>/dev/null || true
  sleep 1
  FACTURAI_OPEN_BROWSER=0 FACTURAI_RELOAD=0 nohup .venv/bin/python run.py >>logs/uvicorn.log 2>&1 &
  echo $! >logs/uvicorn.pid
  log "FacturAI: http://127.0.0.1:${port}/pagina.html"
}

start_email() {
  local backend="$ROOT/Automatizacion Email Comercial/backend"
  local port=8020
  cd "$backend"
  if [ ! -d .venv ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
  else
    source .venv/bin/activate
  fi
  [ -f .env ] || cp .env.example .env
  mkdir -p logs
  local pids
  pids="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)"
  [ -n "$pids" ] && kill $pids 2>/dev/null || true
  sleep 1
  nohup .venv/bin/python run.py >>logs/uvicorn.log 2>&1 &
  echo $! >logs/uvicorn.pid
  log "Email Comercial: http://127.0.0.1:${port}/panel/"
}

wait_health() {
  local url="$1" label="$2" max="${3:-30}"
  for i in $(seq 1 "$max"); do
    if curl -sf "$url" >/dev/null; then
      log "OK — $label"
      return 0
    fi
    sleep 1
  done
  log "AVISO — $label no respondió a tiempo ($url)"
  return 1
}

log "Chatbot (8000)..."
"$ROOT/Automatizacion Chatbot/scripts/arrancar-api.sh"

start_facturas
start_email
start_web

wait_health "http://127.0.0.1:8010/health" "FacturAI" || true
wait_health "http://127.0.0.1:8020/health" "Email Comercial" || true
wait_health "http://127.0.0.1:${WEB_PORT}/index.html" "Web Openix" 10 || true

echo ""
echo "=== Openix — todo en marcha ==="
echo "  Web:              http://127.0.0.1:${WEB_PORT}/index.html"
echo "  Chatbot panel:    http://127.0.0.1:8000/panel/clientes.html"
echo "  FacturAI:         http://127.0.0.1:8010/pagina.html"
echo "  Email Comercial:  http://127.0.0.1:8020/panel/"
echo "  Presupuesto API:  POST http://127.0.0.1:8000/presupuesto/simular"
