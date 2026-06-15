# ── Automatizacion Chatbot — Dockerfile ────────────────────────────────────
# Construir desde la carpeta raíz del proyecto:
#
#   cd "Automatizacion Chatbot"
#   docker build -t chatbot:latest .
#   docker run -d --name chatbot \
#     -p 8000:8000 \
#     --env-file chatbot-backend/.env \
#     chatbot:latest
#
# El panel de administración estará en http://localhost:8000/panel/
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS deps
WORKDIR /install
COPY chatbot-backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/python-pkgs -r requirements.txt

FROM python:3.12-slim AS final
COPY --from=deps /python-pkgs /usr/local

# Estructura en el contenedor:
#   /app/                      → raíz de "Automatizacion Chatbot/"
#   /app/chatbot-backend/      → Python (FastAPI)
#   /app/panel/                → frontend del panel de administración
#   /app/chatbot-widget/       → widget JS embebible
WORKDIR /app/chatbot-backend

COPY chatbot-backend/ /app/chatbot-backend/
COPY panel/           /app/panel/
COPY chatbot-widget/  /app/chatbot-widget/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CHATBOT_HOST=0.0.0.0 \
    CHATBOT_PORT=8000 \
    CHATBOT_OPEN_BROWSER=0

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
