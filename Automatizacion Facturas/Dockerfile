# ── Automatizacion Facturas — Dockerfile ────────────────────────────────────
# Construir desde la carpeta raíz del proyecto:
#
#   cd "Automatizacion Facturas"
#   docker build -t facturai:latest .
#   docker run -d --name facturai \
#     -p 8010:8010 \
#     -v facturai-data:/app/backend/data \
#     -v facturai-storage:/app/backend/storage \
#     --env-file backend/.env \
#     facturai:latest
#
# El servidor arranca en http://localhost:8010
# ────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: imagen base con dependencias del sistema ───────────────────────
FROM python:3.12-slim AS base

# WeasyPrint requiere Cairo, Pango y GDK-PixBuf para generar PDFs desde HTML.
# fontconfig + dejavu-fonts para que el texto en PDFs se renderice correctamente.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# ── Etapa 2: instalar dependencias Python (capa separada para cache) ─────────
FROM base AS deps
WORKDIR /install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/python-pkgs -r requirements.txt

# ── Etapa 3: imagen final ────────────────────────────────────────────────────
FROM base AS final

COPY --from=deps /python-pkgs /usr/local

# Estructura en el contenedor:
#   /app/           → raíz de "Automatizacion Facturas/"
#   /app/backend/   → Python (FastAPI)
#   /app/css/       → estilos del frontend
#   /app/js/        → JavaScript del frontend
#   /app/pagina.html
WORKDIR /app/backend

COPY css/        /app/css/
COPY js/         /app/js/
COPY pagina.html /app/pagina.html
COPY backend/    /app/backend/

# Directorios de datos — montar como volúmenes Docker en producción
RUN mkdir -p /app/backend/data \
             /app/backend/storage/invoices \
             /app/backend/credentials

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FACTURAI_HOST=0.0.0.0 \
    FACTURAI_PORT=8010 \
    FACTURAI_OPEN_BROWSER=0 \
    FACTURAI_RELOAD=0

EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8010/health')"

CMD ["python3", "run.py"]
