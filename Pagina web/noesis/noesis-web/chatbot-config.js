/**
 * Configuración dinámica del chatbot
 * Cambia automáticamente según el ambiente
 */

window.CHATBOT_CONFIG = {
  // En producción, esto debería venir de una variable de entorno
  // Por ahora, configúralo aquí o actualiza en Netlify
  backendUrl: process.env.CHATBOT_BACKEND || 
             (window.location.hostname === 'localhost' 
               ? 'http://localhost:3000' 
               : 'https://chatbot-noesis-prod.railway.app'),
  
  // Fallback si nada está configurado
  fallback: 'https://chatbot-noesis-prod.railway.app'
};

// Log para debugging
console.log('🤖 Chatbot Backend:', window.CHATBOT_CONFIG.backendUrl);
