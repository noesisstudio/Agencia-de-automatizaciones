# ── Automatizacion Email Comercial — Dockerfile ────────────────────────────
# Construir desde la carpeta raíz del proyecto:
#
#   cd "Automatizacion Email Comercial"
#   docker build -t email-comercial:latest .
#   docker run -d --name email-comercial \
#     -p 8020:8020 \
#     --env-file backend/.env \
#     email-comercial:latest
#
# Panel de borradores en http://localhost:8020/panel/
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS deps
WORKDIR /install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/python-pkgs -r requirements.txt

FROM python:3.12-slim AS final
COPY --from=deps /python-pkgs /usr/local

# Estructura en el contenedor:
#   /app/             → raíz de "Automatizacion Email Comercial/"
#   /app/backend/     → Python (FastAPI)
#   /app/panel/       → frontend del panel
WORKDIR /app/backend

COPY backend/ /app/backend/
COPY panel/   /app/panel/

RUN mkdir -p /app/backend/data /app/backend/logs

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    EMAIL_COMERCIAL_HOST=0.0.0.0 \
    EMAIL_COMERCIAL_PORT=8020

EXPOSE 8020

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8020/health')"

CMD ["python3", "run.py"]
