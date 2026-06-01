#!/bin/bash
# Arranca el backend FacturAI y abre el navegador (macOS). Doble clic en Finder.
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
BACKEND="$ROOT/backend"

if [ ! -d "$BACKEND" ]; then
  echo "No se encuentra la carpeta backend en: $BACKEND"
  read -r
  exit 1
fi

cd "$BACKEND"
if [ ! -d .venv ]; then
  echo "Creando entorno virtual .venv…"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Se creó backend/.env desde .env.example. Añade ANTHROPIC_API_KEY y guarda."
fi

mkdir -p data logs storage/invoices

echo ""
echo "FacturAI — arrancando (se abrirá el navegador). Pulsa Ctrl+C para detener."
echo "URL: http://127.0.0.1:8010/pagina.html"
echo "Login: admin / admin123"
exec python run.py
