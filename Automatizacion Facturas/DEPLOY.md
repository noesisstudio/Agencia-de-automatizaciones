# Despliegue de FacturAI — Guía profesional

Sistema de facturación con IA para empresas. Backend Python (FastAPI) + frontend SPA.

---

## Opción A — VPS con Docker (recomendada para producción)

Necesitas un VPS (Hetzner, DigitalOcean, OVH… desde ~5 €/mes) con Docker instalado.

### 1. Prepara el servidor

```bash
# Instala Docker (si no lo tienes)
curl -fsSL https://get.docker.com | sh

# Clona el repositorio
git clone https://github.com/TU_USUARIO/Agencia-de-automatizaciones.git
cd "Agencia-de-automatizaciones/Automatizacion Facturas"
```

### 2. Configura el entorno

```bash
# Copia la plantilla de producción
cp backend/.env.production backend/.env

# Edita con tus datos reales:
nano backend/.env
```

**Campos obligatorios que debes cambiar:**

| Campo | Qué poner |
|---|---|
| `ANTHROPIC_API_KEY` | Tu clave real de https://console.anthropic.com/ |
| `SECRET_KEY` | Genera con: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_PASSWORD` | Contraseña segura (mínimo 12 caracteres) |
| `CORS_ORIGINS` | Tu dominio: `https://facturas.tudominio.com` |
| `MI_NIF_EMPRESA` | El NIF/CIF de tu empresa |
| `MI_NOMBRE_EMPRESA` | El nombre de tu empresa |

### 3. Despliega

**Sin dominio propio** (acceso por IP:puerto):
```bash
docker compose up -d
# Accede a http://IP_DEL_SERVIDOR:8010
```

**Con dominio propio + HTTPS** (certificado SSL automático):
```bash
# 1. Edita el Caddyfile y pon tu dominio real
nano Caddyfile

# 2. Apunta el DNS de tu dominio a la IP del servidor
#    (registro A en Hostinger/Cloudflare/tu proveedor)

# 3. Despliega con HTTPS
docker compose --profile https up -d
# Accede a https://facturas.tudominio.com
```

### 4. Actualizar

```bash
git pull
docker compose build
docker compose up -d
```

Los datos (base de datos, PDFs) se guardan en volúmenes Docker y sobreviven a las actualizaciones.

---

## Opción B — Railway / Render (sin servidor propio)

### Railway (recomendado)

1. Crea cuenta en [railway.app](https://railway.app)
2. Nuevo proyecto → Deploy from GitHub → selecciona el repo
3. Root directory: `Automatizacion Facturas`
4. Railway detecta el Dockerfile automáticamente
5. Variables de entorno: copia las de `.env.production` al panel de Railway
6. Custom domain: `facturas.tudominio.com` → Railway te da el CNAME

### Render

1. Crea cuenta en [render.com](https://render.com)
2. New Web Service → conecta el repo
3. Root directory: `Automatizacion Facturas`
4. Docker runtime
5. Environment variables: las de `.env.production`

---

## Opción C — Local (desarrollo / demos)

```bash
cd "Automatizacion Facturas/backend"
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Edita .env con tu ANTHROPIC_API_KEY real
python3 run.py
# Se abre http://127.0.0.1:8010
```

---

## Conectar dominio de Hostinger

Si tienes tu dominio en Hostinger y el servidor en otro sitio:

1. En **Hostinger → DNS Zone Editor**
2. Añade un registro **A**:
   - Nombre: `facturas` (para `facturas.tudominio.com`)
   - Valor: la IP de tu VPS
   - TTL: 300
3. Espera ~5 minutos a que propague
4. En el servidor: `docker compose --profile https up -d`
5. Caddy obtiene el certificado SSL automáticamente

---

## Verificar que funciona

```bash
# Health check
curl https://facturas.tudominio.com/health

# Debe devolver:
# {"status":"ok","version":"2.0.0","anthropic_configured":true,...}
```

Si `anthropic_configured` es `false`, revisa tu `ANTHROPIC_API_KEY` en `.env`.

---

## Seguridad en producción

- Cambia `SECRET_KEY` y `ADMIN_PASSWORD` — los de ejemplo NO son seguros
- Nunca expongas el `.env` — está en `.gitignore`
- Los NIF de clientes se guardan cifrados en la base de datos
- Los headers de seguridad (X-Frame-Options, HSTS, etc.) se añaden automáticamente
- CORS solo permite los orígenes que pongas en `CORS_ORIGINS`
