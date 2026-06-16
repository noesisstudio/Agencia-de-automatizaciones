# Automatización Chatbot (Openix)

Asistente **informativo** para empresas: suben documentos (Markdown, texto o PDF), publican el bot y los clientes hacen **preguntas libres** por web o WhatsApp.

> **No confundir** con [Presupuesto WhatsApp](../Presupuesto%20Whatsapp/README.md) (producto aparte) ni con [FacturAI](../Automatizacion%20Facturas/README.md).

**Manual completo (instalación, Meta, ngrok, depuración):** [docs/Manual_Chatbot_Motor.pdf](docs/Manual_Chatbot_Motor.pdf)

**Estrategia agencia:** [ESTRATEGIA_OPERATIVA_OPENIX.md](ESTRATEGIA_OPERATIVA_OPENIX.md)

---

## Qué incluye

| Pieza | Descripción |
|-------|-------------|
| `panel/` | Panel Openix: clientes, documentos, WhatsApp, prueba |
| `chatbot-backend/` | API FastAPI (puerto 8000) |
| `chatbot-widget/` | Código fuente del widget (build → copiar a `Pagina web/js/`) |
| `scripts/` | Arranque automático (LaunchAgent macOS) |

---

## Arranque rápido

```bash
# Opción A: doble clic en macOS
./start-chatbot.command

# Opción B: manual
cd chatbot-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edita ANTHROPIC_API_KEY y Meta
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Panel: **http://127.0.0.1:8000/panel/**

1. **Clientes** → crea la empresa (`mi-empresa`, etc.)
2. **Documentos** → texto base + archivos → **Publicar**
3. **WhatsApp** → Phone number ID de Meta
4. **Probar** → diagnóstico automático si algo falla

---

## Estructura

Ver **[ARCHITECTURE.md](ARCHITECTURE.md)** para la arquitectura modular completa.

```text
Automatizacion Chatbot/
├── ARCHITECTURE.md
├── docs/META_WHATSAPP.md         ← Guía Meta (variables y pasos exactos)
├── panel/                        ← UI: clientes, documentos, WhatsApp, probar
├── chatbot-backend/
│   ├── app/modules/              ← clientes, documentos, chat, whatsapp
│   └── data/tenants/{id}/
└── scripts/
```

---

## API principal

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/bot/tenants/{id}/diagnostico` | Por qué no funciona + solución |
| `POST` | `/bot/tenants/{id}/chat` | Probar mensaje |
| `POST` | `/web/chat` | Widget en la web Openix |
| `GET/POST` | `/whatsapp/webhook` | Meta WhatsApp (chat con IA + documentos) |
| `GET/POST` | `/presupuesto/webhook` | Meta WhatsApp (**solo presupuestos** por menú) |
| `POST` | `/presupuesto/simular` | Probar flujo presupuesto sin Meta |
| `PUT` | `/presupuesto/tenants/{id}/catalogo` | Tarifas del cliente (JSON) |

> **Dos productos, dos webhooks:** en Meta apunta cada número a `/whatsapp/webhook` (preguntas libres) o a `/presupuesto/webhook` (catálogo numerado + LISTO). Mismas variables `META_*`.

Docs interactivas: **http://127.0.0.1:8000/docs**

---

## Variables `.env` (mínimo)

```env
ANTHROPIC_API_KEY=sk-ant-...
META_ACCESS_TOKEN=...          # WhatsApp
META_VERIFY_TOKEN=...
CHATBOT_TENANT_DEFAULT=mi-empresa
```

Phone number ID **por cliente** → panel WhatsApp (no hace falta uno por `.env`).

---

## Si algo falla

1. Panel → **Probar chat** → banner de diagnóstico
2. O: `GET /bot/tenants/mi-empresa/diagnostico`
3. Manual PDF: sección «Resolución de problemas»
4. Logs: `chatbot-backend/logs/uvicorn.log` (si existe)

---

## Web Openix

En `Pagina web/js/site-config.js`:

```javascript
window.OPENIX = {
  chatApiBaseUrl: "http://127.0.0.1:8000",
  chatTenantId: "mi-empresa",
};
```

El widget cargado es `Pagina web/js/chatbot-widget.js` (build del proyecto `chatbot-widget/`).
