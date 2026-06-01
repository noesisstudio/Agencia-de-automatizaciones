#!/bin/bash
# Arranque completo tras reiniciar el Mac: API, conocimiento, publicar, ngrok (opcional).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/chatbot-backend"
PANEL="$ROOT/panel"
PORT="${CHATBOT_PORT:-8000}"
BASE="http://127.0.0.1:${PORT}"
LOG_DIR="$BACKEND/logs"
PID_FILE="$LOG_DIR/uvicorn.pid"
NGROK_PID_FILE="$LOG_DIR/ngrok.pid"

mkdir -p "$LOG_DIR"

if [ -f "$BACKEND/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND/.env"
  set +a
fi

TENANT="${CHATBOT_TENANT_DEFAULT:-mi-empresa}"

log() { printf '[post-reinicio] %s\n' "$*"; }

ensure_venv() {
  cd "$BACKEND"
  if [ ! -d .venv ]; then
    log "Creando entorno virtual..."
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -q -r requirements.txt
  if [ ! -f .env ]; then
    cp .env.example .env
    log "Creado .env desde plantilla — edita las claves antes de producción."
  fi
}

seed_knowledge_if_needed() {
  local knowledge="$BACKEND/data/tenants/${TENANT}/knowledge.md"
  local plantilla="$PANEL/plantilla-conocimiento.md"
  if [ ! -f "$knowledge" ]; then
    mkdir -p "$(dirname "$knowledge")"
  fi
  if [ ! -f "$plantilla" ]; then
    log "Sin plantilla en panel/plantilla-conocimiento.md — omite seed."
    return 0
  fi
  if grep -q "Pendiente: sube documentos" "$knowledge" 2>/dev/null || [ "$(wc -c <"$knowledge" | tr -d ' ')" -lt 120 ]; then
    log "Cargando plantilla de conocimiento en ${TENANT}..."
    cp "$plantilla" "$knowledge"
    sed -i '' '1s/.*/# Mi Empresa (piloto)/' "$knowledge" 2>/dev/null || sed -i '1s/.*/# Mi Empresa (piloto)/' "$knowledge"
  else
    log "Conocimiento de ${TENANT} ya tiene contenido — no se sobrescribe."
  fi
}

api_up() {
  curl -sf "${BASE}/health" >/dev/null 2>&1
}

start_api() {
  if api_up; then
    log "API ya en marcha en ${BASE}"
    return 0
  fi
  if [ -f "$PID_FILE" ]; then
    old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
      log "Esperando API (pid $old_pid)..."
    else
      rm -f "$PID_FILE"
    fi
  fi
  log "Iniciando uvicorn en puerto ${PORT}..."
  cd "$BACKEND"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  nohup "$BACKEND/.venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT" >>"$LOG_DIR/uvicorn.log" 2>&1 &
  echo $! >"$PID_FILE"
}

wait_api() {
  local i=0
  while [ "$i" -lt 45 ]; do
    if api_up; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  log "ERROR: la API no respondió en ${BASE}/health"
  tail -n 20 "$LOG_DIR/uvicorn.log" 2>/dev/null || true
  exit 1
}

publish_tenant() {
  log "Publicando chatbot de ${TENANT}..."
  resp="$(curl -sf -X POST "${BASE}/bot/tenants/${TENANT}/publicar" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1)" || {
    log "Publicar falló (¿falta conocimiento?): $resp"
    return 1
  }
  log "Publicado: $resp"
}

show_health() {
  log "Estado WhatsApp:"
  curl -sf "${BASE}/whatsapp/health" | python3 -m json.tool 2>/dev/null || curl -sf "${BASE}/whatsapp/health"
  echo ""
  log "Instalación (${TENANT}):"
  curl -sf "${BASE}/bot/setup/status?tenant_id=${TENANT}" | python3 -m json.tool 2>/dev/null || true
  echo ""
}

start_ngrok_if_enabled() {
  if [ "${NGROK_AUTOSTART:-0}" != "1" ]; then
    log "Ngrok: desactivado (NGROK_AUTOSTART=1 en .env para activar)."
    log "Webhook local: instala ngrok y ejecuta: ngrok http ${PORT}"
    log "URL en Meta: https://TU-TUNEL.ngrok-free.app/whatsapp/webhook"
    return 0
  fi
  if ! command -v ngrok >/dev/null 2>&1; then
    log "NGROK_AUTOSTART=1 pero ngrok no está instalado (brew install ngrok)."
    return 0
  fi
  if [ -f "$NGROK_PID_FILE" ]; then
    npid="$(cat "$NGROK_PID_FILE" 2>/dev/null || true)"
    if [ -n "${npid:-}" ] && kill -0 "$npid" 2>/dev/null; then
      log "Ngrok ya en marcha (pid $npid)"
    else
      rm -f "$NGROK_PID_FILE"
    fi
  fi
  if ! kill -0 "$(cat "$NGROK_PID_FILE" 2>/dev/null)" 2>/dev/null; then
    log "Iniciando ngrok http ${PORT}..."
    nohup ngrok http "$PORT" --log=stdout >>"$LOG_DIR/ngrok.log" 2>&1 &
    echo $! >"$NGROK_PID_FILE"
    sleep 3
  fi
  tunnel="$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for t in d.get('tunnels',[]):
    u=t.get('public_url','')
    if u.startswith('https://'):
        print(u)
        break
" 2>/dev/null || true)"
  if [ -n "${tunnel:-}" ]; then
    log "Webhook para Meta: ${tunnel}/whatsapp/webhook"
    log "Verify token (.env META_VERIFY_TOKEN): ${META_VERIFY_TOKEN:-}"
  else
    log "Ngrok arrancado; abre http://127.0.0.1:4040 para ver la URL HTTPS."
  fi
}

main() {
  log "=== Post-reinicio Openix Chatbot ==="
  ensure_venv
  seed_knowledge_if_needed
  start_api
  wait_api
  publish_tenant || true
  show_health
  start_ngrok_if_enabled
  log ""
  log "Listo. Panel: ${BASE}/panel/"
  log "Prueba WhatsApp cuando el webhook en Meta apunte a tu URL HTTPS."
}

main "$@"
