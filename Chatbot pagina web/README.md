# Chatbot de página web — Kit comercial

Todo lo necesario para vender e instalar el chatbot de **página web** a empresas.
(El chatbot de **WhatsApp** está en `../Automatizacion Chatbot meta/whatsapp-bot/`.)

## Los dos productos web

| Producto | Cómo responde | Precio orientativo | Carpeta |
|---|---|---|---|
| **Con IA** (Claude + Netlify) | IA genera la respuesta con el conocimiento del cliente | Setup 1.200-2.500 € · 200-400 €/mes | `chatbot-ia-netlify/` |
| **Sin IA** (Voiceflow + Make) | Flujos y respuestas predefinidas | Setup 600-1.000 € · 100-200 €/mes | `chatbot-sin-ia/` |

> La diferencia legal entre "con IA" y "sin IA" está explicada en
> `../Automatizacion Chatbot meta/whatsapp-bot/1-DIFERENCIAS-LEGALES.md` (aplica igual a web).

## Archivos clave

- **COMO-FUNCIONA.md** — cómo funciona el chatbot con IA y el montaje por cliente.
- **PLANTILLA-conocimiento-cliente.md** — base en blanco; se rellena por cada cliente.
- **chatbot-ia-netlify/INSTALACION.md** — instalar el chatbot con IA (solución real en producción).
- **chatbot-sin-ia/** — kit del chatbot sin IA (flujos).
- **legal/** — marco legal para la entrega a clientes.

## ¿Dónde está el chatbot que ya funciona (Noesis)?

En la raíz del repo:
- `netlify/functions/chat.js` (cerebro) · `netlify/functions/noesis-conocimiento.md` (conocimiento)
- `web/chatbot-widget.js` (botón de chat) · `netlify.toml` (config)

## Para instalar a un cliente nuevo

1. Elige producto (con IA o sin IA).
2. Sigue la guía de su carpeta.
3. Rellena `PLANTILLA-conocimiento-cliente.md` con la info del cliente.
4. Entrega con aviso de privacidad (y aviso de IA si es el bot con IA).
