# Automatización de facturas (Noesis)

Interfaz **FacturAI** (CSS local: `css/facturas-base-local.css` + `css/facturas.css`). La extracción la hace el **backend FastAPI** con **Claude (Anthropic)**; la clave va solo en `backend/.env`, no en la página.

1. Recibe PDF/imagen de factura.
2. Llama a **Claude** para extraer JSON estructurado.
3. Detecta el **contexto de empresa** (emisor vs receptor) si configuras `MI_NIF_EMPRESA` / `MI_NOMBRE_EMPRESA`.
4. Opcional: **Google Sheets** (cuenta de servicio).
5. Devuelve **plantilla HTML** descargable.

> Abre la herramienta con **uvicorn** en el mismo puerto (`http://127.0.0.1:8010/pagina.html`). Abrir solo el HTML por `file://` no puede llamar al API: el aviso en pantalla lo indica.

## Arranque rápido (un solo servidor)

La API FastAPI **sirve también la interfaz** (`pagina.html`, `css/`, `js/`). No hace falta levantar `python -m http.server` aparte.

```bash
cd Automatizacion Facturas/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env: ANTHROPIC_API_KEY obligatorio; Google opcional
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Abre en el navegador:

- `http://127.0.0.1:8010/` → redirige a `pagina.html`
- o directamente `http://127.0.0.1:8010/pagina.html`

Comprueba el API: `http://127.0.0.1:8010/health` → debe devolver JSON con `"status":"ok"`. **`anthropic_configured": false` no es un error del servidor**: solo indica que aún no hay clave en `backend/.env` o está vacía; el campo `message` lo resume. Con clave bien guardada y uvicorn reiniciado debería ser `true`.

### Por qué a veces «no funciona» Claude (backend)

1. **`.env` en el sitio correcto**: debe estar en `Automatizacion Facturas/backend/.env` (junto a `requirements.txt`). La app **siempre** lee ese archivo, aunque ejecutes `uvicorn` desde otra carpeta.
2. **`ANTHROPIC_API_KEY`**: sin espacios ni comillas raras; reinicia uvicorn tras guardar.
3. **`ANTHROPIC_MODEL`**: los modelos antiguos dejan de responder. Por defecto se usa `claude-sonnet-4-5-20250929`; si Anthropic devuelve error de modelo, cambia el ID por uno de la [documentación de modelos](https://docs.anthropic.com/en/docs/about-claude/models).
4. **Créditos / facturación** en la consola de Anthropic.
5. **Abrir la UI en el mismo origen** que el API (`http://127.0.0.1:8010/pagina.html`).

## Google Sheets (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto (o usa uno existente).
2. **APIs y servicios → Biblioteca** → activa **Google Sheets API** y **Google Drive API** (Drive suele hacer falta para que la cuenta de servicio «vea» la hoja compartida).
3. **Cuentas de servicio** → Crear cuenta de servicio → **Claves → Añadir clave → JSON** y descarga el archivo (por ejemplo `noesis-sheets.json`).
4. Crea una **hoja de cálculo** en Google Sheets. Pulsa **Compartir** y añade el email **`client_email`** que aparece dentro del JSON (rol **Editor**).
5. El **ID de la hoja** es la parte larga de la URL: `https://docs.google.com/spreadsheets/d/ESTE_ID/edit`.
6. En `backend/.env`:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → ruta **absoluta** al JSON, o ruta **relativa a la carpeta `backend/`** (ej. `noesis-sheets.json` si el archivo está dentro de `backend/`).
   - `GOOGLE_SPREADSHEET_ID` → el ID de la URL.
   - `GOOGLE_SHEET_NAME` → nombre exacto de la pestaña (por defecto `Facturas`); si no existe, se usa la pestaña con ese nombre al escribir (gspread puede fallar si el nombre no coincide: crea la pestaña o ajusta el nombre).

Si algo falla al escribir, revisa en la consola de Google que las APIs estén activas y que la hoja esté compartida con el email del JSON. Sin Google configurado, la extracción con Claude sigue funcionando; en la respuesta verás `sheets.skipped: true`.

### Si sirves la UI en otro puerto (opcional)

Si sirves los estáticos en otro origen y el API en `8010`, en `pagina.html` o en consola:

`window.FACTURAS_API_URL = "http://127.0.0.1:8010"`

## Endpoints API

- `POST /invoice/process` — `multipart/form-data` campo `file`; respuesta incluye `extracted`, `sheets`, `template_html`.
- `POST /invoice/plantilla` — JSON ya extraído → `{ "html": "..." }` (campo extra `_filename` opcional).
