# 🚀 Despliegue Automático - Chatbot Noesis

Este documento explica cómo desplegar automáticamente el frontend y backend de Noesis.

---

## Paso 1: Frontend (Netlify) - AUTOMÁTICO ✅

El frontend ya está configurado en Netlify:

1. **Conecta el repositorio GitHub a Netlify:**
   - Ve a https://app.netlify.com
   - Click en "New site from Git"
   - Conecta tu repositorio GitHub
   - Build settings:
     - Base directory: `.` (raíz)
     - Build command: (vacío)
     - Publish directory: `Pagina web/noesis/noesis-web`

2. **Cada vez que hagas push a GitHub, Netlify publica automáticamente.**

---

## Paso 2: Backend (Railway) - SEMI-AUTOMÁTICO

### 2.1 Crear proyecto en Railway

1. Ve a https://railway.app
2. Click en "New Project"
3. Selecciona "Deploy from GitHub"
4. Conecta tu repositorio

### 2.2 Configurar el proyecto

1. **Source:**
   - Repository: tu-repo
   - Branch: main
   - Root Directory: `Chatbot pagina web/bot-b/backend`

2. **Environment Variables:**
   - `ANTHROPIC_API_KEY`: Tu clave de Anthropic
   - `TENANT_ID`: noesis
   - `EMPRESA_NOMBRE`: Noesis
   - `ALLOWED_ORIGINS`: https://noesis.com,https://www.noesis.com,https://noesis.netlify.app
   - `APP_ENV`: production

3. **Deploy:**
   - Railway detectará `package.json` y `npm start`
   - Build automático ✅
   - Deploy automático ✅

### 2.3 Obtener la URL del backend

1. Una vez deployado, Railway te dará una URL como:
   ```
   https://chatbot-noesis-prod.railway.app
   ```

2. **Copia esta URL y actualiza en Netlify:**
   - Ve a tu sitio en Netlify
   - Site settings → Build & deploy → Environment
   - Añade variable: `CHATBOT_BACKEND=https://chatbot-noesis-prod.railway.app`

---

## Paso 3: Actualizar el Widget

El widget debe apuntar al backend en producción:

En `Pagina web/noesis/noesis-web/index.html`, actualiza:

```html
<!-- ANTES: -->
<script src="chatbot-widget.js" data-backend="http://localhost:3000"></script>

<!-- DESPUÉS: -->
<script src="chatbot-widget.js" data-backend="https://chatbot-noesis-prod.railway.app"></script>
```

O mejor aún, usa una variable de entorno de Netlify que inyecte la URL automáticamente.

---

## Flujo Automático Final

```
GitHub Push
    ↓
Netlify detecta cambios en Pagina web/noesis/noesis-web/
    ↓
Frontend publica automáticamente
    ↓
GitHub Push también dispara Railway
    ↓
Backend builds y deploya automáticamente
    ↓
✅ Nuevo chatbot en producción
```

---

## Verificar que funciona

1. Ve a tu dominio: https://noesis.com (o tu dominio)
2. Abre DevTools (F12) → Console
3. Deberías ver mensajes del widget cargando
4. El chatbot debe aparecer en la esquina inferior derecha
5. Prueba escribiendo una pregunta

---

## Troubleshooting

### El chatbot no aparece
- Verifica que `data-backend` apunta a la URL correcta de Railway
- Abre DevTools → Console para ver errores
- Verifica CORS: `ALLOWED_ORIGINS` debe incluir tu dominio

### Respuestas vacías
- Revisa que `ANTHROPIC_API_KEY` está en Railway
- Mira logs en Railway: Project → Logs

### Widget se carga pero no responde
- Verifica conectividad entre Netlify y Railway
- Comprueba que Railway está en "Running"
- Revisa que el backend inicia sin errores

---

## Actualizar el conocimiento

Para cambiar lo que el chatbot sabe:

1. Edita: `Chatbot pagina web/bot-b/noesis-conocimiento.md`
2. Push a GitHub
3. Railway redeploya automáticamente ✅
4. El nuevo conocimiento está listo en 2-3 minutos

---

## Resumen de URLs

| Servicio | URL |
|----------|-----|
| Frontend | https://noesis.com (tu dominio) |
| Backend | https://chatbot-noesis-prod.railway.app |
| API Chat | https://chatbot-noesis-prod.railway.app/api/chat |
| Health Check | https://chatbot-noesis-prod.railway.app/health |

