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
3. **3-WORKFLOW-bot-sin-ia.md** — montaje del bot por base de datos en n8n.
4. **4-WORKFLOW-bot-con-ia.md** — montaje del bot con IA (Claude) en n8n.

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
