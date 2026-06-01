# Agencia de automatizaciones — visión del repositorio

Este documento resume cómo está organizado el proyecto: qué hace cada carpeta, cómo se relacionan las piezas y qué comunica el sitio principal (**Openix**), tomando como referencia el HTML de entrada `Pagina web/index.html` y el resto del código presente en el repo.

---

## 1. Propósito del repositorio

Monorepo orientado a una **agencia de automatización con IA**: sitio corporativo estático, demos o módulos de producto (facturas, chatbot) y documentación de estrategia técnica. No hay un único `package.json` o `README` en la raíz; cada subcarpeta es un bloque relativamente independiente.

---

## 2. Sitio corporativo: `Pagina web/`

### 2.1 Marca y mensaje (extraído de `index.html`)

| Aspecto | Contenido |
|--------|------------|
| **Marca** | Openix |
| **Título / SEO** | “Openix — Automatización con IA para tu negocio” |
| **Descripción** | Automatización con IA y no-code: seguimiento de leads, email y presupuestos automáticos; clínicas, despachos y negocios en España |
| **URL canónica** | `https://www.openix.es/` |
| **Público** | Banner orientado a empresas y despachos (facturas, pagos, estado del servicio) |
| **Idiomas** | Español y catalán (conmutador en cabecera; textos con `data-i18n` en `js/i18n.js`) |
| **Stack visual** | Fuentes Syne + DM Sans; estilos en `css/styles.css` |

Productos del monorepo (cada uno en su carpeta y puerto):

| Carpeta | Producto | Puerto API |
|---------|----------|------------|
| `Automatizacion Chatbot/` | Chatbot web + WhatsApp | **8000** |
| `Automatizacion Facturas/` | FacturAI | **8010** |
| `Automatizacion Email Comercial/` | Borradores email B2B (leads) | **8020** |
| `Presupuesto Whatsapp/` | Menú presupuesto (sin IA libre) | vía chatbot `/presupuesto/simular` |

### 2.2 Páginas HTML

| Archivo | Función aproximada |
|---------|-------------------|
| `index.html` | Home: hero, barra de herramientas, hub de enlaces a las demás secciones |
| `servicios.html` | Servicios y método (incluye anclas como `#nichos`) |
| `precios.html` | Precios y bundles |
| `seguridad.html` | RGPD, credenciales, contratos |
| `contacto.html` | Formulario / primera reunión |
| `legal.html` | Información legal |
| `login.html` | Acceso área clientes |
| `recuperar-contrasena.html` | Recuperación de contraseña |
| `portal.html` | Portal de clientes (facturación Openix vía JSON en `data/client-billing/`) |
| `404.html` | Página de error |

### 2.3 Recursos estáticos y JS

- **`css/styles.css`** — Estilos globales del sitio.
- **`js/site-config.js`** — Config global `window.OPENIX`: `chatApiBaseUrl` (vacío por defecto) y `chatTenantId` (`"openix"`).
- **`js/i18n.js`** — Internacionalización (ES/CA).
- **`js/main.js`** — Comportamiento común (navegación, año en footer, etc.).
- **`js/chatbot-init.js`** — Si `chatApiBaseUrl` tiene valor, carga de forma asíncrona `js/chatbot-widget.js` con `data-api-url` y `data-tenant-id`.
- **`js/chatbot-widget.js`** — Cliente del widget embebido en la web estática.
- **`js/portal-app.js`**, **`js/portal-billing.js`** — Panel de cliente: carga `data/client-billing/{usuario}.json` (facturas y pagos de servicios Openix, no FacturAI).
- **`data/client-billing/*.json`** — Datos por cliente del portal.
- **`sitemap.xml`**, **`robots.txt`** — SEO básico.

### 2.4 Mapa mental del home (`index.html`)

1. **Cabecera**: banner clientes + idioma; menú (Inicio, Servicios, Precios, Seguridad, Contacto); enlace a login.
2. **Hero**: propuesta “piloto automático”, CTA a demo y servicios; estadísticas (horas recuperadas, tiempo de respuesta, consulta inicial).
3. **Barra de tecnología**: Make.com, OpenAI/Claude, Airtable, Google Workspace, Typeform, WhatsApp Business, Gmail, Google Docs.
4. **Hub “Apartados”**: tarjetas a servicios, precios, seguridad, contacto y área clientes (login).
5. **Pie**: enlaces legales y copy dinámico del año.

---

## 3. Chatbot conversacional: `Automatizacion Chatbot/`

Asistente con **preguntas libres**: la empresa sube documentos (Markdown, texto, PDF) y el bot responde usando **Claude** y el archivo `knowledge.md`. Si el cliente escribe *no entiendo*, reformula la última respuesta.

Documentación detallada: **`Automatizacion Chatbot/README.md`**.

### 3.1 Componentes

| Pieza | Rol |
|-------|-----|
| **`panel/`** | Web para configurar (`/panel/` en la API) y probar el chat |
| **`chatbot-backend/`** | FastAPI, puerto **8000** |
| **`chatbot-widget/`** | Widget Vite para embeber en sitios |
| **`web-frontend/`** | Next.js opcional |

### 3.2 Backend (`chatbot-backend/`)

- **`app/api/routes_bot.py`** — `/bot/tenants/{id}`: subir conocimiento, publicar, chat de prueba.
- **`app/api/routes_web.py`** — `/web/chat` para el widget de `Pagina web`.
- **`app/api/routes_whatsapp.py`** — Webhook Meta → `chat_engine`.
- **`app/api/routes_presupuesto.py`** — `/presupuesto/simular` (enlaza motor del módulo hermano).
- **`app/services/knowledge_store.py`** — Subidas y `data/tenants/{id}/knowledge.md`.
- **`app/services/chat_engine.py`** — IA + reformular respuestas.
- **`app/core/prompts.py`** — Prompts del sistema.

Variables clave en `.env`: `ANTHROPIC_API_KEY`, `CHATBOT_TENANT_DEFAULT`, tokens `META_*` para WhatsApp.

### 3.3 Integración con `Pagina web`

1. Despliega el backend (`uvicorn`, puerto 8000).
2. En `js/site-config.js`: `chatApiBaseUrl` y `chatTenantId` (mismo ID que en el panel).
3. `chatbot-init.js` carga el widget contra `/web/chat`.

---

## 4. Presupuesto WhatsApp: `Presupuesto Whatsapp/`

Producto **separado**: menú numerado de servicios, **LISTO** para total con IVA, sin chat libre con IA. Documentación: **`Presupuesto Whatsapp/README.md`**.

| Pieza | Rol |
|-------|-----|
| `motor_presupuesto.py` | Lógica del menú y cálculo |
| `catalogo_ejemplo.json` | Tarifas demo |
| `simulador.html` | Prueba en navegador |
| `arquitectura.html` | Guía Meta vs BuilderBot |

Prueba vía API del chatbot: `POST http://127.0.0.1:8000/presupuesto/simular`.

---

## 5. Email comercial B2B: `Automatizacion Email Comercial/`

Asistente de **borradores** para comerciales: analiza el correo del lead y redacta respuesta usando la documentación de la empresa. **No envía emails** (human-in-the-loop, RGPD).

Documentación: **`Automatizacion Email Comercial/README.md`**.

| Pieza | Rol |
|-------|-----|
| **`panel/`** | Web en `/panel/` (empresas, documentación, probar borrador) |
| **`backend/`** | FastAPI, puerto **8020** |
| **`data/empresas/{id}/knowledge.md`** | Base de conocimiento + RAG |

Endpoint principal: `POST /empresas/{empresa_id}/draft` (integración Make / CRM / Gmail).

---

## 6. Demo facturas: `Automatizacion Facturas/`

- **`pagina.html`** — Página única **“FacturAI — Automatización Inteligente”**: UI tipo panel (sidebar de clientes, estados, estilos inline). Es un prototipo o landing técnica independiente del sitio Openix; no comparte `css/` ni `js/` con `Pagina web/`.

---

## 6. Email comercial B2B: `Automatizacion Email Comercial/`

Módulo **independiente** (puerto **8020**): borradores de respuesta a leads por correo, con RAG sobre `data/empresas/{id}/knowledge.md`. Human-in-the-loop; no envía emails. Documentación: **`Automatizacion Email Comercial/README.md`**.

- **`POST /empresas/{id}/draft`** — genera JSON (`analysis` + `email_draft`) para Make/CRM.
- Separado del chatbot: distinto backend, datos y prompt.

---

## 7. Estructura de carpetas (resumen)

```text
Agencia de automatizaciones/
├── PROYECTO.md
├── Pagina web/
├── Automatizacion Chatbot/           ← :8000
├── Automatizacion Facturas/          ← :8010
├── Automatizacion Email Comercial/   ← :8020
└── Presupuesto Whatsapp/
```

*(Se omiten `node_modules`, cachés y archivos del sistema; el widget y el frontend Next incluyen dependencias npm locales.)*

---

## 8. Convenciones útiles

- **Nombre comercial en web**: Openix (`Pagina web/`).
- **Config global en navegador**: objeto `window.OPENIX` en `site-config.js`.
- **Multi-idioma en sitio**: atributos `data-i18n` / `data-i18n-html` + `i18n.js`.
- **Chat en sitio**: solo activo si `chatApiBaseUrl` no está vacío.

Si este documento deja de coincidir con el código, prioriza el HTML principal (`Pagina web/index.html`) para mensaje de producto y la carpeta `Automatizacion Chatbot/` para la arquitectura del chatbot.
