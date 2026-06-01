#!/bin/bash
# Arranca Email Comercial API (puerto 8020). Doble clic en macOS.
set -e
cd "$(dirname "$0")"
BACKEND="$(pwd)/backend"

if [ ! -d "$BACKEND" ]; then
  echo "No se encuentra backend en: $BACKEND"
  read -r
  exit 1
fi

cd "$BACKEND"
if [ ! -d .venv ]; then
  echo "Creando .venv…"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Creado backend/.env — añade ANTHROPIC_API_KEY."
fi

echo ""
echo "Email Comercial — http://127.0.0.1:8020/docs (Ctrl+C para detener)"
exec python run.py
