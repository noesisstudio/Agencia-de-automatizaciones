# Chatbot de WhatsApp (Meta) — Kit de los 2 productos

Webhook de Meta ya conectado en n8n. Aquí está todo para montar los dos tipos de bot.

## Los dos productos

| Producto | Cómo responde | Precio | Para quién |
|---|---|---|---|
| **Bot por base de datos** (sin IA) | Respuestas fijas desde Google Sheets | Más barato | FAQs, horarios, precios fijos |
| **Bot con IA** (Claude) | Respuestas generadas por IA | Más caro | Muchas preguntas distintas, catálogo amplio |

## Archivos (léelos en orden)

1. **1-DIFERENCIAS-LEGALES.md** — qué cambia legalmente entre los dos y por qué uno es más caro.
2. **2-BASE-DE-DATOS-google-sheets.md** — estructura del Google Sheet (pestañas y columnas).
3. **3-WORKFLOW-bot-sin-ia.md** — explicación del bot por base de datos.
4. **4-WORKFLOW-bot-con-ia.md** — explicación del bot con IA (Claude).

## Workflows listos para importar y probar

- **workflow-bot-sin-ia.json** — bot por base de datos (respuestas por palabras clave).
- **workflow-bot-con-ia.json** — bot con IA (llama a la API de Anthropic / Claude).

> Son **auto-contenidos**: las respuestas (bot sin IA) y el conocimiento (bot con IA)
> van DENTRO del propio workflow, en un nodo Code, para que puedas probar al instante
> sin configurar Google. En producción se pasan a Google Sheets (guías 3 y 4).

### Cómo importar y probar

1. En n8n: **⋮ → Import from File** → elige el `.json`.
2. Rellena los marcadores `REEMPLAZA_...`:
   - **Token valido?** → `REEMPLAZA_TU_VERIFY_TOKEN` (el verify token que pusiste en Meta).
   - **Enviar respuesta (Graph API)** → header Authorization: `Bearer REEMPLAZA_TU_META_ACCESS_TOKEN`.
   - **(Solo bot con IA) Claude** → header `x-api-key`: `REEMPLAZA_TU_ANTHROPIC_API_KEY`.
     - Mejor aún: usa una **credencial** de n8n en vez de pegar la clave en el header.
3. **Guarda y activa** el workflow.
4. En Meta, el webhook ya apunta a `/webhook/meta-webhook` (mismo path que tu webhook actual).
5. Escribe al WhatsApp del negocio y comprueba la respuesta.

> ⚠️ Los dos workflows usan el **mismo path** `meta-webhook`. **Activa solo uno a la vez**
> (o cambia el path de uno) para que no choquen.
>
> ⚠️ Edita las respuestas (nodo *Buscar respuesta (BD)*) o el conocimiento
> (nodo *Construir prompt*) con los datos reales del cliente antes de entregar.

## Instalar para un cliente nuevo (resumen)

1. Crea un Google Sheet a partir de la estructura del archivo 2.
2. Rellena `Config` + `Respuestas` (bot BD) o `Conocimiento` (bot IA).
3. Duplica el workflow de n8n correspondiente (archivo 3 o 4) y conéctalo a:
   - El Google Sheet del cliente (ID).
   - El número de WhatsApp del cliente (Meta: token + phone_number_id).
   - La API key de Anthropic (solo bot con IA).
4. Prueba escribiendo al WhatsApp del negocio.
5. Entrega: aviso de privacidad + (si es IA) aviso de que es una IA.

> El webhook base de n8n está en `../Workflow n8n copia/`.
