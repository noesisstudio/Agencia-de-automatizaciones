#!/bin/bash

# 🚀 Script de Configuración Automática - Chatbot Noesis

set -e

echo "════════════════════════════════════════════════════"
echo "🚀 SETUP AUTOMÁTICO - CHATBOT NOESIS"
echo "════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paso 1: Verificar que es un repo Git
echo -e "${BLUE}1️⃣  Verificando repositorio Git...${NC}"
if [ -d ".git" ]; then
    echo -e "${GREEN}✅ Repositorio Git encontrado${NC}"
    REMOTE_URL=$(git remote get-url origin)
    echo "   URL: $REMOTE_URL"
else
    echo -e "${RED}❌ No es un repositorio Git${NC}"
    exit 1
fi
echo ""

# Paso 2: Obtener credenciales
echo -e "${BLUE}2️⃣  Configurando credenciales...${NC}"
echo ""
echo -e "${YELLOW}Para continuar necesitamos dos tokens:${NC}"
echo ""
echo -e "${YELLOW}📌 TOKEN DE RAILWAY:${NC}"
echo "   1. Ve a: https://railway.app/account/tokens"
echo "   2. Click en 'Create New Token'"
echo "   3. Copia el token generado"
echo ""
read -p "Pega tu RAILWAY_TOKEN: " RAILWAY_TOKEN

if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${RED}❌ Token de Railway vacío${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Token de Railway guardado${NC}"
echo ""

echo -e "${YELLOW}📌 TOKEN DE NETLIFY:${NC}"
echo "   1. Ve a: https://app.netlify.com/user/applications#personal-access-tokens"
echo "   2. Click en 'New access token'"
echo "   3. Copia el token generado"
echo ""
read -p "Pega tu NETLIFY_TOKEN: " NETLIFY_TOKEN

if [ -z "$NETLIFY_TOKEN" ]; then
    echo -e "${RED}❌ Token de Netlify vacío${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Token de Netlify guardado${NC}"
echo ""

# Paso 3: Configurar Railway
echo -e "${BLUE}3️⃣  Configurando Railway...${NC}"

cat > /tmp/railway-config.json << RAILWAY_EOF
{
  "name": "noesis-chatbot-api",
  "description": "API del chatbot Noesis",
  "framework": "nodejs",
  "buildCommand": "npm install",
  "startCommand": "npm start",
  "port": 3000,
  "environmentVariables": {
    "ANTHROPIC_API_KEY": "",
    "TENANT_ID": "noesis",
    "EMPRESA_NOMBRE": "Noesis",
    "APP_ENV": "production",
    "ALLOWED_ORIGINS": "https://noesis.com,https://www.noesis.com"
  }
}
RAILWAY_EOF

echo -e "${YELLOW}ℹ️  Creando proyecto en Railway...${NC}"

# Aquí iría la llamada a la API de Railway
# Por ahora, creamos un archivo con las instrucciones

cat > /tmp/railway-instructions.txt << 'RAILWAY_INSTR'
INSTRUCCIONES PARA RAILWAY:

1. Ve a: https://railway.app/dashboard
2. Click en "New Project"
3. Selecciona "Deploy from GitHub"
4. Conecta tu repo: noesisstudio/Agencia-de-automatizaciones
5. Root Directory: Chatbot pagina web/bot-b/backend
6. En Environment Variables, añade:
   - ANTHROPIC_API_KEY = tu-clave-de-anthropic
   - TENANT_ID = noesis
   - EMPRESA_NOMBRE = Noesis
   - APP_ENV = production
   - ALLOWED_ORIGINS = https://tu-dominio.com
7. Copiar la URL del dominio (ej: https://chatbot-noesis-prod.railway.app)
RAILWAY_INSTR

echo -e "${YELLOW}⚠️  Abre tu navegador y sigue estas instrucciones:${NC}"
cat /tmp/railway-instructions.txt
echo ""
read -p "Pega la URL de Railway una vez deployado (ej: https://chatbot-xxx.railway.app): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo -e "${RED}❌ URL de Railway vacía${NC}"
    exit 1
fi
echo -e "${GREEN}✅ URL de Railway: $RAILWAY_URL${NC}"
echo ""

# Paso 4: Configurar Netlify
echo -e "${BLUE}4️⃣  Configurando Netlify...${NC}"

# Actualizar netlify.toml con la URL de Railway
sed -i '' "s|CHATBOT_BACKEND = \"https://chatbot-noesis-prod.railway.app\"|CHATBOT_BACKEND = \"$RAILWAY_URL\"|g" netlify.toml

echo -e "${YELLOW}ℹ️  Instrucciones para Netlify:${NC}"

cat > /tmp/netlify-instructions.txt << 'NETLIFY_INSTR'
INSTRUCCIONES PARA NETLIFY:

1. Ve a: https://app.netlify.com
2. Click en "Add new site" → "Import an existing project"
3. Conecta GitHub
4. Selecciona repo: noesisstudio/Agencia-de-automatizaciones
5. Build settings:
   - Base directory: (dejar vacío)
   - Build command: (dejar vacío)
   - Publish directory: Pagina web/noesis/noesis-web
6. Click en "Deploy site"
7. Una vez deployado:
   - Site settings → Build & deploy → Environment
   - Añade variable: CHATBOT_BACKEND = (tu-url-de-railway)
8. Copiar el dominio de Netlify
NETLIFY_INSTR

cat /tmp/netlify-instructions.txt
echo ""
read -p "Pega la URL de Netlify una vez deployado (ej: https://noesis-xxx.netlify.app): " NETLIFY_URL

if [ -z "$NETLIFY_URL" ]; then
    echo -e "${RED}❌ URL de Netlify vacía${NC}"
    exit 1
fi
echo -e "${GREEN}✅ URL de Netlify: $NETLIFY_URL${NC}"
echo ""

# Paso 5: Actualizar configuración
echo -e "${BLUE}5️⃣  Actualizando configuración...${NC}"

# Actualizar chatbot-config.js con la URL de Railway
sed -i '' "s|https://chatbot-noesis-prod.railway.app|$RAILWAY_URL|g" "Pagina web/noesis/noesis-web/chatbot-config.js"

# Actualizar index.html
sed -i '' "s|data-backend=\"http://localhost:3000\"|data-backend=\"$RAILWAY_URL\"|g" "Pagina web/noesis/noesis-web/index.html"

echo -e "${GREEN}✅ Archivos actualizados${NC}"
echo ""

# Paso 6: Hacer commit y push
echo -e "${BLUE}6️⃣  Haciendo commit y push...${NC}"

git add netlify.toml "Pagina web/noesis/noesis-web/chatbot-config.js" "Pagina web/noesis/noesis-web/index.html"
git commit -m "config: actualizar URLs de backend (Railway) y frontend (Netlify)" || true
git push

echo -e "${GREEN}✅ Push completado${NC}"
echo ""

# Resumen final
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✅ CONFIGURACIÓN COMPLETADA${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 Resumen:"
echo "   Frontend: $NETLIFY_URL"
echo "   Backend:  $RAILWAY_URL"
echo "   Chatbot:  Activo en esquina inferior derecha"
echo ""
echo "🔄 Flujo automático activado:"
echo "   git push → GitHub → Netlify + Railway se actualizan automático"
echo ""
echo "📖 Guía completa: DEPLOY-AUTOMATICO.md"
echo ""

