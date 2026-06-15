# Cómo funciona el chatbot (y cómo montarlo para cada cliente)

## La idea en una frase

Es un chatbot informativo: responde **solo** con la información que tú le das en
un archivo de texto. No inventa. Vive dentro de la web del cliente como una
"función serverless" de Netlify, así que no hay servidor que mantener.

## Las 3 piezas

1. **El conocimiento** — un archivo `.md` con la info del cliente (servicios,
   precios, horarios, FAQs). Es lo ÚNICO que cambia por cliente.
2. **La función** — `chat.js`: guarda la clave de IA (secreta) y le pregunta a
   Claude usando ese conocimiento. Es igual para todos los clientes.
3. **El widget** — `chatbot-widget.js`: el botón de chat que se ve en la web.
   Igual para todos.

## Cómo está montado en Noesis (ejemplo real)

- Función:    `netlify/functions/chat.js`
- Conocimiento: `netlify/functions/noesis-conocimiento.md`
- Widget:     `web/chatbot-widget.js` (pegado en las páginas de `/web`)
- Clave:      `ANTHROPIC_API_KEY` en el panel de Netlify (NUNCA en el código)

## Montar un cliente nuevo (≈ 1 hora, casi todo recopilar info)

1. **Recopila su info** y rellena una copia de `PLANTILLA-conocimiento-cliente.md`.
   → Renómbrala, p.ej. `panaderia-lopez-conocimiento.md`.
2. **Coloca los 3 archivos en SU proyecto de Netlify:**
   - `netlify/functions/chat.js`  (copia tal cual)
   - `netlify/functions/[cliente]-conocimiento.md`  (su info)
   - `chatbot-widget.js`  en la carpeta que publica su web
3. **Ajusta 2 cosas en `chat.js`:**
   - El nombre del archivo de conocimiento que lee.
   - El nombre de la empresa y el email en las reglas (SYSTEM_RULES).
4. **Pega el widget** en su web, antes de `</body>`:
   `<script src="chatbot-widget.js" defer></script>`
5. **Pon su `ANTHROPIC_API_KEY`** en el panel de Netlify del cliente.
6. **Deploy.** Listo.

## Mantenimiento (lo que cobras cada mes)

Cuando el cliente cambie precios, horarios o servicios: editas su `.md`, haces
deploy y en 2 minutos el bot ya lo sabe. No se toca código.

## Coste real por cliente

- Netlify: gratis hasta mucho tráfico.
- Claude (Haiku): céntimos por conversación; ~5-20 €/mes en uso normal.
- Tu precio: setup 1.200-2.500 € + mantenimiento 200-400 €/mes.

## Cuándo dar el salto a algo más grande

Lo de ahora es ideal para los primeros clientes. Cuando tengas muchos y quieras
gestionarlos desde un único panel (subir el `.md` sin tocar archivos), se monta
un servicio multi-cliente. Pero eso solo compensa con volumen; no lo necesitas
para empezar a vender.
