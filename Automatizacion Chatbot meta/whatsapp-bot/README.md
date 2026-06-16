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

## Workflows listos (basados en TU workflow real)

Están en la carpeta `../Workflow n8n copia/` (junto a tu webhook original):

- **Meta WhatsApp Chatbot - SIN IA (base de datos).json** — tu flujo + respuestas por palabras clave.
- **Meta WhatsApp Chatbot - CON IA.json** — tu flujo + llamada a la API de Anthropic (Claude).
- **Meta WhatsApp Chatbot - Webhook (1).json** — tu webhook original (sin cerebro).

Son **tu mismo flujo** (mismos nodos, tus tokens, tu verify token), con el cerebro
añadido entre *Extraer datos* y *Enviar respuesta*. El conocimiento (bot IA) y las
respuestas (bot BD) van dentro de un nodo Code; en producción se pasan a Google
Sheets (guías 2, 3 y 4).

### Cómo usarlos

1. En n8n: **⋮ → Import from File** → elige el `.json` que quieras (SIN IA o CON IA).
2. Solo en el **CON IA**: en el nodo *Claude*, pon tu clave en `x-api-key`
   (`REEMPLAZA_TU_ANTHROPIC_API_KEY`). Mejor con una **credencial** de n8n.
3. Edita el nodo *Buscar respuesta (BD)* o *Construir prompt* con los datos reales.
4. **Guarda y activa.**
5. Escribe al WhatsApp del negocio y comprueba la respuesta.

> ⚠️ Los tres usan el **mismo path** `meta-webhook`. **Activa solo uno a la vez**
> (desactiva el webhook original antes de activar el que tenga cerebro).

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
