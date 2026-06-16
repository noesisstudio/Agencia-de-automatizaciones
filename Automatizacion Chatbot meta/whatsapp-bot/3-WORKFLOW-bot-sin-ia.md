# Workflow n8n — Bot por base de datos (sin IA)

Parte de tu workflow actual (el que ya verifica el webhook y extrae el mensaje).
Solo añadimos el "cerebro" entre **Extraer datos** y **Enviar respuesta**.

```
Webhook Mensajes (POST)
  → Es un mensaje?  (IF)
     → Extraer datos (Set: from, text, phone_number_id, nombre)
        → [1] Leer Respuestas (Google Sheets)
        → [2] Buscar coincidencia (Code)
        → [3] Enviar respuesta (Graph API)   ← ya lo tienes, solo cambia el body
        → [4] Guardar conversación (Google Sheets)
```

---

## Nodo [1] — "Leer Respuestas" (Google Sheets)

- Tipo: **Google Sheets → Get Rows**
- Document: tu Sheet del cliente (por ID)
- Sheet: `Respuestas`
- Devuelve todas las filas (id, palabras_clave, respuesta, activo).

## Nodo [2] — "Buscar coincidencia" (Code)

- Tipo: **Code** (JavaScript). Pega esto:

```js
// Mensaje del usuario (del nodo Extraer datos)
const texto = ($('Extraer datos').item.json.text || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, ''); // quita acentos

// Filas de la pestaña Respuestas
const filas = $input.all().map(i => i.json);

let respuesta = null;
for (const f of filas) {
  if ((f.activo || '').toLowerCase() !== 'si') continue;
  const claves = (f.palabras_clave || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (claves.some(c => texto.includes(c))) { respuesta = f.respuesta; break; }
}

// Si no hay coincidencia, usa el fallback (ponlo aquí o léelo de la pestaña Config)
if (!respuesta) {
  respuesta = 'No estoy seguro de eso. Te paso con una persona del equipo.';
}

return [{ json: { respuesta } }];
```

> Mejora opcional: añade un nodo "Leer Config" y usa `mensaje_fallback` en vez del texto fijo.

## Nodo [3] — "Enviar respuesta (Graph API)" (HTTP Request)

Ya lo tienes; solo asegúrate del body. Configuración:

- Método: **POST**
- URL: `https://graph.facebook.com/v21.0/{{ $('Extraer datos').item.json.phone_number_id }}/messages`
- Auth header: `Authorization: Bearer TU_META_ACCESS_TOKEN`
- Header: `Content-Type: application/json`
- Body (JSON):

```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $('Extraer datos').item.json.from }}",
  "type": "text",
  "text": { "body": "{{ $('Buscar coincidencia').item.json.respuesta }}" }
}
```

## Nodo [4] — "Guardar conversación" (Google Sheets → Append)

- Sheet: `Conversaciones`
- Columnas:
  - fecha: `{{ $now.format('yyyy-LL-dd HH:mm') }}`
  - telefono: `{{ $('Extraer datos').item.json.from }}`
  - nombre: `{{ $('Extraer datos').item.json.nombre }}`
  - mensaje: `{{ $('Extraer datos').item.json.text }}`
  - respuesta: `{{ $('Buscar coincidencia').item.json.respuesta }}`
  - tipo: `bd`

---

## Probar

1. Activa el workflow.
2. Escribe al WhatsApp del negocio: "¿a qué hora abrís?" → debe responder la fila de horario.
3. Escribe algo sin coincidencia → debe responder el fallback.
4. Revisa que la pestaña `Conversaciones` registra ambas.

## Coste

- n8n: tu instancia (self-host gratis o n8n Cloud).
- Google Sheets: gratis.
- WhatsApp: gratis dentro de la ventana de servicio de 24 h.
- **IA: 0 € (este bot no usa IA).**
