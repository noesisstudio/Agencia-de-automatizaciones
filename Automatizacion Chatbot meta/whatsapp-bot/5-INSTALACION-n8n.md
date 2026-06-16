# Guía de instalación de n8n (para el chatbot de WhatsApp)

n8n es la herramienta donde vive el workflow. Tienes dos formas de tenerlo:
**n8n Cloud** (más fácil, de pago tras prueba) o **autoalojado** (gratis, más técnico).

---

## Opción A — n8n Cloud (recomendada para empezar)

1. Crea cuenta en **https://n8n.io** → "Get started" (hay prueba gratis).
2. Te dan una instancia con URL propia, p. ej. `https://tuespacio.app.n8n.cloud`.
3. Esa URL ya es pública y con HTTPS → sirve directamente para el webhook de Meta.
4. Salta al apartado **"Importar el workflow"**.

Ventajas: sin servidores, HTTPS y actualizaciones incluidas. Coste: desde ~20 €/mes.

---

## Opción B — Autoalojado con Docker (gratis)

Necesitas un servidor (un VPS de Hetzner/DigitalOcean, ~5 €/mes) o tu propio ordenador.

```bash
# 1. Instala Docker (si no lo tienes): https://docs.docker.com/get-docker/

# 2. Arranca n8n
docker run -d --restart unless-stopped \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_HOST="tu-dominio.com" \
  -e WEBHOOK_URL="https://tu-dominio.com/" \
  docker.n8n.io/n8nio/n8n

# 3. Abre http://localhost:5678 (o tu dominio) y crea el usuario admin
```

> Meta exige **HTTPS** en el webhook. Si autoalojas, necesitas un dominio con
> certificado (lo más fácil: poner n8n detrás de Caddy o Nginx con HTTPS, o usar
> el proxy de tu VPS).

### Para pruebas locales rápidas (sin servidor): ngrok

```bash
# Expone tu n8n local con una URL pública HTTPS temporal
ngrok http 5678
# Usa la URL https://xxxx.ngrok-free.app como webhook en Meta
```

---

## Importar el workflow

1. En n8n: menú **⋮ → Import from File** y elige uno de:
   - `Workflow n8n copia/Meta WhatsApp Chatbot - SIN IA (base de datos).json`
   - `Workflow n8n copia/Meta WhatsApp Chatbot - CON IA.json`
   - (o copia el contenido del `.json` y pégalo con **Cmd/Ctrl+V** en el lienzo)

2. Revisa/ajusta:
   - Nodo **Token valido?** → el verify token (debe coincidir con el de Meta).
   - Nodo **Enviar respuesta (Graph API)** → header Authorization con tu token de Meta.
   - Solo CON IA → nodo **Claude** → header `x-api-key` con tu clave de Anthropic.
   - Nodo **Construir prompt** (IA) o **Buscar respuesta (BD)** → la info del negocio.

---

## Conectar el webhook con Meta

1. En cada nodo Webhook de n8n verás dos URLs: **Test** y **Production**.
   La de producción es del tipo: `https://tu-n8n/webhook/meta-webhook`.
2. En **Meta → WhatsApp → Configuración → Webhooks**:
   - Callback URL: la URL de producción de n8n.
   - Verify token: el mismo que pusiste en el nodo *Token valido?*.
   - Suscríbete al campo **messages**.
3. Meta hará una petición GET de verificación → el workflow responde el challenge.

---

## Activar

1. Pulsa **Active** (arriba a la derecha) para que el webhook de producción funcione.
2. ⚠️ **Solo un workflow activo con el path `meta-webhook`.** Si activas el CON IA,
   **desactiva** el webhook original y el SIN IA.

---

## Probar

Escribe al número de WhatsApp del negocio. Deberías recibir respuesta en segundos.
Si no llega:
- Revisa **Executions** en n8n (ahí ves errores).
- Comprueba el token de Meta (caduca; los temporales duran 24 h — usa uno permanente).
- Verifica que el workflow está **Active** y es el único con ese path.

---

## Buenas prácticas

- Guarda las claves como **Credentials** de n8n, no escritas en los nodos.
- Usa un **token permanente** de Meta (System User Token), no el de prueba de 24 h.
- Un workflow por cliente, o un Google Sheet por cliente si usas base de datos.
