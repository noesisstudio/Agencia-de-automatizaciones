# Base de datos en Google Sheets (WhatsApp)

Usamos **un Google Sheet por cliente**. Es barato (gratis), el cliente puede
ver/editar sus respuestas, y n8n se conecta a él de forma nativa.

> Regla: **un Sheet = un cliente**. Así los datos de cada cliente están separados.
> Nómbralo p. ej. `WhatsApp Bot — Panadería López`.

---

## Pestañas (hojas) del documento

### Pestaña `Config`  — ajustes del bot (ambos tipos)

| clave | valor (ejemplo) |
|---|---|
| empresa_nombre | Panadería López |
| email_contacto | hola@panaderialopez.com |
| mensaje_bienvenida | ¡Hola! Soy el asistente de Panadería López 🥖 |
| mensaje_fallback | No estoy seguro de eso. Te paso con una persona: hola@panaderialopez.com |
| usa_ia | no   *(no = bot por BD · si = bot con IA)* |

### Pestaña `Respuestas`  — SOLO bot por BD (sin IA)

| id | palabras_clave | respuesta | activo |
|---|---|---|---|
| 1 | horario, abrís, abierto, hora | Abrimos de lunes a sábado de 7:00 a 14:00 y de 17:00 a 20:00. | si |
| 2 | dirección, dónde, ubicación, llegar | Estamos en C/ Mayor 12, Barcelona. | si |
| 3 | precio, cuánto, vale, coste | Tenemos pan desde 1,20 €. Dime qué producto te interesa. | si |
| 4 | encargo, reservar, pedido | Puedes encargar llamando al 600 000 000 o respondiendo aquí. | si |

- **palabras_clave**: separadas por comas. Si el mensaje del usuario contiene alguna, se envía esa `respuesta`.
- **activo**: `si` / `no` para encender/apagar una respuesta sin borrarla.
- El orden importa: si varias coinciden, gana la primera.

### Pestaña `Conocimiento`  — SOLO bot con IA

| seccion | contenido |
|---|---|
| Sobre la empresa | Panadería artesana en Barcelona desde 1990… |
| Productos | Pan de masa madre, bollería, tartas por encargo… |
| Horario | L-S 7:00-14:00 y 17:00-20:00. Domingos cerrado. |
| Precios | Pan desde 1,20 €. Tartas por encargo desde 18 €. |
| Encargos | Con 24 h de antelación por teléfono o WhatsApp. |

La IA lee TODAS las filas y las usa como su base de conocimiento. Para cambiar lo
que sabe el bot, el cliente edita esta pestaña.

### Pestaña `Conversaciones`  — registro (ambos tipos)

| fecha | telefono | nombre | mensaje | respuesta | tipo |
|---|---|---|---|---|---|
| 2026-06-16 10:32 | 34600000000 | María | ¿abrís hoy? | Abrimos de 7 a 14h | bd |
| 2026-06-16 10:40 | 34611111111 | Joan | ¿hacéis tartas sin gluten? | Sí, por encargo… | ia |

Sirve como **registro legal** y para ver qué pregunta la gente. `tipo`: `bd`, `ia` o `humano`.

### Pestaña `Leads`  — opcional (oportunidades comerciales)

| fecha | telefono | nombre | interes |
|---|---|---|---|
| 2026-06-16 | 34600000000 | María | Encargo tarta cumpleaños |

---

## Conservación de datos (GDPR)

- Borra filas de `Conversaciones` con más de **12 meses** (o el plazo que acuerdes).
- No guardes datos sensibles. Si aparecen, deriva a humano y no los registres.

---

## Conexión con n8n

1. En n8n: **Credentials → Google Sheets (OAuth2)** → conecta la cuenta de Google donde está el Sheet.
2. Copia el **ID del documento** (está en la URL del Sheet: `.../d/ESTE_ID/edit`).
3. Ese ID se usa en los nodos de Google Sheets de los dos workflows.
