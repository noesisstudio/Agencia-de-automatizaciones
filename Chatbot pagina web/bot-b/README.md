# Bot B — Con inteligencia artificial

Stack: **Widget JS propio + Node.js (Railway) + Claude API + Supabase pgvector + SMTP del cliente**

Coste operativo: 34–101 €/mes | Setup que cobras: 1.200–2.500 € | Mantenimiento: 200–400 €/mes

---

## Estructura de carpetas

```
bot-b/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.js                   ← Entrada del servidor Express
│   │   ├── routes/
│   │   │   ├── chat.js                ← POST /api/chat (endpoint principal)
│   │   │   └── lead.js                ← POST /api/lead (formulario explícito)
│   │   └── services/
│   │       ├── claude.js              ← Llamada a Claude API
│   │       ├── rag.js                 ← Búsqueda semántica en Supabase
│   │       ├── systemPrompt.js        ← Construcción del system prompt
│   │       ├── intentDetector.js      ← Detecta emails y teléfonos en el texto
│   │       ├── conversationStore.js   ← Guarda mensajes y leads en Supabase
│   │       ├── email.js               ← Envío de emails via SMTP del cliente
│   │       └── supabase.js            ← Cliente Supabase
│   └── scripts/
│       └── upload-knowledge.js        ← Carga documentos del cliente en Supabase
├── widget/
│   ├── widget.js                      ← Widget embebible (sin dependencias)
│   └── snippet.html                   ← Código a pegar en la web del cliente
├── supabase/
│   └── 001_setup_pgvector.sql         ← SQL a ejecutar en Supabase (una sola vez)
└── checklist-bot-b.md
```

---

## Orden de implementación para cada cliente

### Día 1 — Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → pegar y ejecutar `supabase/001_setup_pgvector.sql`
3. Copiar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (Settings → API)

### Día 1 — Cuenta Anthropic

1. Crear cuenta en [console.anthropic.com](https://console.anthropic.com)
2. Aceptar el DPA: Settings → Privacy → Data Processing Agreement → guardar PDF
3. Generar API key: Settings → API Keys
4. Configurar alerta de gasto: Billing → Usage alerts (recomendado: alerta a 50 €)

### Día 1 — Cuenta Voyage AI (embeddings)

1. Crear cuenta en [voyageai.com](https://voyageai.com)
2. Generar API key
3. Tiene tier gratuito generoso para empezar (200M tokens/mes gratis)

### Día 2 — Backend en Railway

1. Railway → New Project → Deploy from repo (o Empty Project → Node)
2. Añadir variables de entorno del `.env.example`
3. Verificar que `/health` responde correctamente
4. Copiar la URL del despliegue (ej: `https://bot-b-cliente.up.railway.app`)

### Día 2 — Base de conocimiento

1. Recopilar documentos del cliente: FAQs, precios, catálogo, horarios, política
2. Convertirlos a `.md` o `.txt` en una carpeta `./conocimiento/`
3. Ejecutar:
   ```bash
   cd backend
   npm install
   node scripts/upload-knowledge.js ./conocimiento/
   ```
4. Probar búsquedas con 20+ preguntas reales del sector del cliente

### Día 3 — Widget y entrega

1. Alojar `widget/widget.js` (Railway puede servirlo como estático, o CDN)
2. Pegar el snippet de `widget/snippet.html` en la web del cliente
3. Actualizar `ALLOWED_ORIGINS` en el .env con el dominio del cliente
4. Probar en escritorio y móvil
5. Recorrer `checklist-bot-b.md` punto por punto

---

## Coste de operación mensual estimado

| Concepto | Coste |
|----------|-------|
| Railway (backend) | 5–10 €/mes |
| Supabase (BD + vectores) | 0–25 €/mes |
| Anthropic Claude Haiku (1.000 conversaciones) | 5–20 €/mes |
| Voyage AI (embeddings) | 0–5 €/mes |
| **Total** | **10–60 €/mes** |

---

## Notas importantes

**Por qué Claude Haiku y no Sonnet:**
Haiku es 10x más barato y responde en < 1 segundo. Para atención al cliente el 90% de las preguntas no necesitan la potencia de Sonnet. Si tienes un cliente con consultas muy complejas (despacho de abogados, B2B técnico), cambia a `claude-sonnet-4-6` en `services/claude.js`.

**Por qué Voyage AI para embeddings:**
Anthropic no tiene API de embeddings propia. Voyage AI es el proveedor que Anthropic recomienda oficialmente. Para clientes con datos muy sensibles donde no quieres enviar texto a ningún servicio americano, evalúa Cohere Embed (canadiense, servidores UE disponibles).

**Un despliegue por cliente:**
Cada cliente tiene su propio proyecto en Railway con su propio `.env`. Así los datos de cada cliente están completamente separados y el fallo de uno no afecta a los demás.
