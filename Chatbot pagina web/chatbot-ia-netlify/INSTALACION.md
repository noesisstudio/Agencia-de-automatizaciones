# Instalación — Chatbot web con IA (Netlify)

Esta es la solución **en producción** del chatbot de página web. El código real
vive en la raíz del repo:

- Función (cerebro): `netlify/functions/chat.js`
- Conocimiento: `netlify/functions/noesis-conocimiento.md`
- Widget (botón de chat): `web/chatbot-widget.js`
- Config de Netlify: `netlify.toml`

No hay servidor que mantener: es una **función serverless** de Netlify. La clave
de IA va en variables de entorno de Netlify, nunca en el código.

---

## Instalar para un cliente nuevo (≈ 1 hora)

### 1. Conocimiento del cliente
- Copia `Chatbot pagina web/PLANTILLA-conocimiento-cliente.md`.
- Rellénala con la info real del cliente.
- Guárdala como `netlify/functions/<cliente>-conocimiento.md` en SU proyecto.

### 2. Función
- Copia `netlify/functions/chat.js` tal cual.
- Cambia 2 cosas dentro:
  - El nombre del archivo de conocimiento que lee.
  - El nombre de la empresa y el email en `SYSTEM_RULES`.

### 3. Widget
- Copia `web/chatbot-widget.js` a la carpeta que publica la web del cliente.
- Pega antes de `</body>` en sus páginas:
  ```html
  <script src="chatbot-widget.js" defer></script>
  ```

### 4. Netlify
- En el sitio del cliente: **Site configuration → Environment variables**
  - `ANTHROPIC_API_KEY` = su clave de Anthropic
- `netlify.toml` debe incluir:
  ```toml
  [functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  included_files = ["netlify/functions/<cliente>-conocimiento.md"]
  ```
- **Deploys → Trigger deploy.**

### 5. Probar
- Abre la web del cliente, abre el chat, haz una pregunta. Debe responder con su info.

---

## Mantenimiento (lo que cobras)
- ¿Cambian precios/horarios? Editas su `.md`, deploy, listo en 2 min. No se toca código.

## Coste
- Netlify: gratis (plan free cubre de sobra una web normal).
- Claude (Haiku): ~5-20 €/mes según uso.

## Legal
- El widget ya enlaza a `/privacidad.html` y el bot se identifica como IA.
- La privacidad del cliente debe mencionar que usa Claude (Anthropic). Ver `../legal/`.
