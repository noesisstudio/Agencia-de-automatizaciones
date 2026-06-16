# Agencia de automatizaciones — Mapa del repositorio

Monorepo de una **agencia de automatización con IA**. Contiene el sitio web, los
productos que se venden a empresas (chatbots, automatizaciones) y la documentación
para instalarlos a cada cliente.

> Marca actual del sitio web: **Noesis** (bynoesis.com).
> Última actualización de este documento: junio 2026.

---

## 1. Sitio web (en producción)

| Carpeta | Qué es |
|---|---|
| `web/` | **Web de Noesis que publica Netlify.** HTML estático + el widget del chatbot (`web/chatbot-widget.js`). Es la carpeta que sale en producción (`netlify.toml` → `publish = "web"`). |
| `netlify/functions/` | **Funciones serverless.** `chat.js` = cerebro del chatbot web (llama a Claude). `noesis-conocimiento.md` = lo que sabe el bot. |
| `netlify.toml` | Config de Netlify (publica `web/` + funciones). |
| `Pagina web/` | Material de marca y versiones de la web (kits de Noesis, copias antiguas). **No es lo que se publica.** |

> ⚠️ La web real es `web/`. `Pagina web/noesis/noesis-web/` es una copia antigua; no se despliega.

---

## 2. Productos que se venden (con su kit de instalación)

| Carpeta | Producto | Estado |
|---|---|---|
| `Chatbot pagina web/` | **Chatbot de página web** (2 versiones: con IA / sin IA). Kit comercial + guías de instalación. | Activo · ver su `README.md` |
| `Automatizacion Chatbot meta/` | **Chatbot de WhatsApp** (Meta). Webhook n8n + backend Python + panel. Kit en `whatsapp-bot/` (2 versiones: por base de datos / con IA). | Activo · webhook conectado |
| `Automatizacion Facturas/` | Lectura y extracción de datos de facturas (PDF/imagen). | Ver su README |
| `Automatizacion Email Comercial/` | Clasificación y borradores de email comercial. | Ver su README |
| `Automatizacion presupuesto/` | Generador de propuestas/presupuestos. | Ver su README |
| `Presupuesto Whatsapp/` | Presupuestos por WhatsApp (menú + catálogo JSON, sin IA). | Ver su README |

---

## 3. Soporte

| Carpeta | Qué es |
|---|---|
| `supabase/` | Configuración de Supabase (cuando un producto necesita base de datos). |
| `scripts/` | Scripts auxiliares del repo. |
| `[ARCHIVADOR] Requiere Revisión/` | Material antiguo pendiente de revisar o archivar. |

---

## 4. Los dos "sabores" de cada chatbot

Tanto el chatbot web como el de WhatsApp se venden en dos niveles:

- **Sin IA (por base de datos / flujos):** respuestas predefinidas. Más barato, más
  simple legalmente. Ideal para FAQs, horarios, precios fijos.
- **Con IA (Claude):** respuestas generadas. Más caro, más potente. Para preguntas
  variadas o catálogo amplio.

La comparación legal y de precio está en:
`Automatizacion Chatbot meta/whatsapp-bot/1-DIFERENCIAS-LEGALES.md`.

---

## 5. Dónde empezar según lo que quieras hacer

- **Tocar la web de Noesis** → `web/`
- **Cambiar lo que responde el chatbot web** → `netlify/functions/noesis-conocimiento.md`
- **Instalar el chatbot web a un cliente** → `Chatbot pagina web/README.md`
- **Montar el chatbot de WhatsApp** → `Automatizacion Chatbot meta/whatsapp-bot/README.md`
- **Plantilla de info de un cliente nuevo** → `Chatbot pagina web/PLANTILLA-conocimiento-cliente.md`

---

## 6. Seguridad (importante)

- Las claves (`ANTHROPIC_API_KEY`, tokens de Meta, etc.) van **solo** en variables
  de entorno (Netlify / n8n / `.env` local), **nunca** en el código del repo.
- Los archivos `.env` están en `.gitignore` y no se suben.
