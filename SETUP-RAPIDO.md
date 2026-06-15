# ⚡ Setup Rápido - Despliegue Automático

Ejecuta esto en tu terminal (no en VS Code):

## 🚀 Paso 1: Obtener Tokens

### Token de Railway:
```bash
# Abre en navegador:
open https://railway.app/account/tokens
# O copia: https://railway.app/account/tokens
# Click en "Create Token" y copia el resultado
```

### Token de Netlify:
```bash
# Abre en navegador:
open https://app.netlify.com/user/applications#personal-access-tokens
# O copia: https://app.netlify.com/user/applications#personal-access-tokens
# Click en "New access token" y copia el resultado
```

---

## 🔧 Paso 2: Crear Variables de Entorno

En tu terminal, configura los tokens:

```bash
export RAILWAY_TOKEN="tu-railway-token-aqui"
export NETLIFY_TOKEN="tu-netlify-token-aqui"
export ANTHROPIC_API_KEY="sk-ant-v1-tu-clave-aqui"
```

---

## 🚀 Paso 3: Desplegar con Railway CLI

```bash
# 1. Instalar Railway CLI (solo primera vez)
npm install -g @railway/cli

# 2. Login en Railway
railway login --token $RAILWAY_TOKEN

# 3. Crear proyecto y desplegar
cd "Chatbot pagina web/bot-b/backend"
railway link  # Selecciona crear nuevo proyecto
railway up    # Despliega

# 4. Obtener URL
railway open  # Se abre en navegador, copia la URL

# Copia la URL que aparece (ej: https://chatbot-noesis-prod.railway.app)
export RAILWAY_URL="https://tu-url-railway.app"
```

---

## 🌐 Paso 4: Desplegar con Netlify CLI

```bash
# 1. Instalar Netlify CLI (solo primera vez)
npm install -g netlify-cli

# 2. Login en Netlify
netlify login --auth-token $NETLIFY_TOKEN

# 3. Ir a carpeta web
cd "Pagina web/noesis/noesis-web"

# 4. Desplegar
netlify deploy --prod

# 5. Copiar URL (ej: https://noesis-xxx.netlify.app)
export NETLIFY_URL="https://tu-url-netlify.app"
```

---

## 🔗 Paso 5: Conectar Frontend ↔ Backend

```bash
# Actualizar URLs en los archivos
cd /ruta/a/Agencia-de-automatizaciones

# Actualizar netlify.toml
sed -i '' "s|chatbot-noesis-prod.railway.app|${RAILWAY_URL##https://}|g" netlify.toml

# Actualizar chatbot-config.js
sed -i '' "s|https://chatbot-noesis-prod.railway.app|$RAILWAY_URL|g" "Pagina web/noesis/noesis-web/chatbot-config.js"

# Actualizar index.html
sed -i '' "s|http://localhost:3000|$RAILWAY_URL|g" "Pagina web/noesis/noesis-web/index.html"

# Commit y push
git add netlify.toml "Pagina web/noesis/noesis-web/"
git commit -m "config: URLs de Railway y Netlify"
git push
```

---

## ✅ Verificar que funciona

```bash
# En Netlify, ve a:
# https://app.netlify.com/sites/tu-sitio/settings/general

# En Railway, ve a:
# https://railway.app/project/tu-proyecto

# Prueba el chatbot:
# https://tu-sitio.netlify.app
```

---

## 🎯 ¿Lista la configuración?

Una vez hagas todo esto:

1. **Railway despliega automático** en cada `git push`
2. **Netlify despliega automático** en cada `git push`
3. **El chatbot está vivo** en tu web

