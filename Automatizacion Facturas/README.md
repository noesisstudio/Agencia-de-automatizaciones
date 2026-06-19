# FacturAI — Sistema de facturación con IA (Noesis)

Sistema profesional de facturación: sube un PDF o imagen de factura, la IA extrae los datos,
tú los revisas y guardas. Dashboard, clientes, exportación a Excel/CSV/Google Sheets, PDF, email.

## Funcionalidades

- Extracción de datos de facturas con IA (Claude de Anthropic)
- Dashboard con gráficas de facturación mensual y por estado
- CRUD completo de facturas, clientes y productos
- Generación de PDF profesional (WeasyPrint / ReportLab)
- Exportación a Excel, CSV y Google Sheets
- Envío de facturas por email (SMTP)
- Autenticación JWT con cifrado de NIF/CIF
- Tema claro/oscuro, responsive

## Arranque rápido (local)

```bash
cd "Automatizacion Facturas/backend"
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Edita .env con tu ANTHROPIC_API_KEY real
python3 run.py                 # Se abre http://127.0.0.1:8010
```

**Login por defecto:** `admin` / la contraseña que pongas en `ADMIN_PASSWORD` del `.env`.

## Despliegue en producción

Ver **[DEPLOY.md](DEPLOY.md)** para instrucciones completas:
- VPS con Docker (recomendado) — `docker compose up -d`
- Railway / Render (sin servidor propio)
- Dominio propio con HTTPS automático (Caddy)

## Estructura

```
Automatizacion Facturas/
├── backend/               # FastAPI (Python)
│   ├── app/
│   │   ├── main.py        # App principal
│   │   ├── models.py      # Tablas SQLAlchemy
│   │   ├── schemas.py     # Validación Pydantic
│   │   ├── api/           # Rutas (auth, invoices, clients, export, dashboard)
│   │   ├── services/      # Lógica de negocio (Claude, PDF, email, Sheets)
│   │   ├── core/          # Config, auth, seguridad
│   │   └── templates/     # Plantilla HTML de factura
│   ├── requirements.txt
│   ├── .env.example        # Plantilla de variables
│   └── .env.production     # Plantilla para producción
├── js/modules/            # Frontend SPA (vanilla JS)
├── css/                   # Estilos
├── pagina.html            # Interfaz principal
├── docker-compose.yml     # Despliegue one-click
├── Dockerfile             # Imagen Docker
├── Caddyfile              # HTTPS automático
└── DEPLOY.md              # Guía de despliegue
```

## Variables de entorno clave

| Variable | Obligatoria | Qué es |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Clave de https://console.anthropic.com/ |
| `SECRET_KEY` | Sí | Clave de cifrado JWT (generar con `python3 -c "import secrets; print(secrets.token_hex(32))"`) |
| `ADMIN_PASSWORD` | Sí | Contraseña del admin inicial |
| `CORS_ORIGINS` | Sí (prod) | Dominio de producción |
| `MI_NIF_EMPRESA` | No | Tu NIF (detecta si eres emisor/receptor) |
| `GOOGLE_SPREADSHEET_ID` | No | ID de Google Sheets para exportación automática |
| `SMTP_HOST` | No | Servidor SMTP para enviar facturas por email |

## API endpoints principales

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/auth/login` | Login (devuelve JWT) |
| `POST` | `/invoice/process` | Sube factura → IA extrae datos |
| `POST` | `/invoice/save-extracted` | Guarda datos revisados |
| `GET` | `/invoices` | Lista facturas |
| `POST` | `/invoices` | Crea factura manual |
| `GET` | `/invoices/{id}/pdf` | Descarga PDF |
| `GET` | `/export/invoices/excel` | Exporta a Excel |
| `GET` | `/health` | Health check |

Docs interactivas: `http://localhost:8010/docs` (Swagger UI).

## Seguridad

- Claves solo en `.env` (nunca en el código)
- NIF/CIF cifrados con Fernet/AES en la base de datos
- Contraseñas hasheadas con bcrypt
- JWT con expiración configurable
- Headers de seguridad (X-Frame-Options, X-Content-Type-Options, HSTS)
- CORS restrictivo en producción
