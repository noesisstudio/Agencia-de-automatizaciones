# Chatbot Noesis - Setup Rápido

## ✅ Estado: LISTO PARA USAR

Todos los componentes están configurados. Solo necesitas:

1. **ANTHROPIC_API_KEY** en `.env`
2. Ejecutar el backend
3. Testear

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Configura la API Key

Edita `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-v1-TU-CLAVE-AQUI
```

Obtén la clave en: https://console.anthropic.com

### 2. Ejecuta el backend

```bash
cd backend
npm install
npm start
```

Deberías ver:
```
✅ Base de conocimiento cargada
Bot B backend · tenant=noesis · puerto=3000
```

### 3. Prueba el chatbot

Abre en navegador:
```
file:///Users/xagri/Documents/GitHub/Agencia\ de\ automatizaciones/Agencia-de-automatizaciones/Pagina\ web/noesis/noesis-web/index.html
```

¡El botón del chatbot debe aparecer en la esquina inferior derecha!

---

## 📋 Componentes Creados

✅ `noesis-conocimiento.md` - Base de conocimiento
✅ `backend/src/services/knowledge-simple.js` - Servicio de búsqueda
✅ `backend/.env` - Configuración
✅ `Pagina web/noesis/noesis-web/chatbot-widget.js` - Widget integrado
✅ `Pagina web/noesis/noesis-web/privacidad.html` - Política actualizada

---

## 🔒 Seguridad & Legal

✅ Transparencia: "Eres un sistema de IA"
✅ GDPR: Política privacidad menciona Claude
✅ Anti-alucinaciones: "No tengo info, contacta equipo"
✅ DPA: Anthropic cumple GDPR

---

## 📞 Próximo Paso: Despliegue

Cuando todo funcione localmente:

1. Deploy backend en Railway/Heroku
2. Actualiza `data-backend` en widget
3. Deploy noesis-web en Netlify
4. ¡Listo en producción!

