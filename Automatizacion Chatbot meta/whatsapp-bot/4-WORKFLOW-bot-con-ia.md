# Workflow n8n — Bot con IA (Claude)

Mismo webhook que ya tienes. El "cerebro" ahora es Claude, que responde usando
el `Conocimiento` del cliente (pestaña del Google Sheet).

```
Webhook Mensajes (POST)
  → Es un mensaje?  (IF)
     → Extraer datos (Set: from, text, phone_number_id, nombre)
        → [1] Leer Conocimiento (Google Sheets)
        → [2] Construir prompt (Code)
        → [3] Claude (HTTP Request)
        → [4] Enviar respuesta (Graph API)
        → [5] Guardar conversación (Google Sheets)
```

---

## Nodo [1] — "Leer Conocimiento" (Google Sheets → Get Rows)

- Document: Sheet del cliente · Sheet: `Conocimiento`
- Devuelve filas (seccion, contenido).

## Nodo [2] — "Construir prompt" (Code)

```js
const texto = $('Extraer datos').item.json.text || '';
const filas = $input.all().map(i => i.json);
const conocimiento = filas.map(f => `## ${f.seccion}\n${f.contenido}`).join('\n\n');

const system = `Eres el asistente virtual de la empresa.

IDENTIFICACIÓN (obligatoria por ley): eres una IA, no una persona. Si te preguntan
si eres humano, dilo con honestidad.

COMPORTAMIENTO: responde en español, amable y breve (máx. 3 frases). Solo sobre
la empresa. Si escriben en otro idioma, responde en ese idioma.

ANTI-ALUCINACIONES: si la respuesta no está en el CONOCIMIENTO, di:
"No tengo esa información confirmada. Te paso con una persona del equipo."
Nunca inventes precios, fechas ni condiciones.

CONOCIMIENTO:
${conocimiento}`;

return [{ json: { system, mensaje: texto } }];
```

## Nodo [3] — "Claude" (HTTP Request)

- Método: **POST**
- URL: `https://api.anthropic.com/v1/messages`
- Headers:
  - `x-api-key`: `TU_ANTHROPIC_API_KEY`  *(mejor con credencial de n8n, no en texto)*
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`
- Body (JSON):

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 500,
  "system": "{{ $('Construir prompt').item.json.system }}",
  "messages": [
    { "role": "user", "content": "{{ $('Construir prompt').item.json.mensaje }}" }
  ]
}
```

> Modelo: **Haiku** es rápido y barato (ideal atención al cliente). Si el cliente
> necesita respuestas más elaboradas, cambia a `claude-sonnet-4-6`.

## Nodo [4] — "Enviar respuesta (Graph API)" (HTTP Request)

- POST `https://graph.facebook.com/v21.0/{{ $('Extraer datos').item.json.phone_number_id }}/messages`
- Header `Authorization: Bearer TU_META_ACCESS_TOKEN`
- Body:

```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $('Extraer datos').item.json.from }}",
  "type": "text",
  "text": { "body": "{{ $('Claude').item.json.content[0].text }}" }
}
```

## Nodo [5] — "Guardar conversación" (Google Sheets → Append)

- Sheet: `Conversaciones`
- fecha: `{{ $now.format('yyyy-LL-dd HH:mm') }}`
- telefono: `{{ $('Extraer datos').item.json.from }}`
- nombre: `{{ $('Extraer datos').item.json.nombre }}`
- mensaje: `{{ $('Extraer datos').item.json.text }}`
- respuesta: `{{ $('Claude').item.json.content[0].text }}`
- tipo: `ia`

---

## Importante (legal — ver 1-DIFERENCIAS-LEGALES.md)

- El **primer mensaje** debe avisar de que es una IA. Ej. añade al
  `mensaje_bienvenida`: "(asistente automático con IA)".
- El aviso de privacidad del cliente debe mencionar que se usa **Claude (Anthropic)**.
- Acepta el **DPA de Anthropic** en console.anthropic.com.

## Memoria de conversación (opcional, mejora)

Para que recuerde el hilo: antes de llamar a Claude, lee de `Conversaciones` los
últimos mensajes de ese `telefono` y añádelos al array `messages`. Para un bot
informativo no suele hacer falta.

## Coste

- IA (Haiku): céntimos por conversación, ~5-20 €/mes en uso normal.
- Resto (n8n, Sheets, WhatsApp): igual que el bot sin IA.
