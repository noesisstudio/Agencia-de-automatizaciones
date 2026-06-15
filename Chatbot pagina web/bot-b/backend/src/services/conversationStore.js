// Almacenamiento en memoria (desarrollo)
// En producción, usar Supabase real

const conversations = {};

async function saveMessage(sessionId, role, content) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }
  conversations[sessionId].push({ role, content, timestamp: new Date() });
  return { data: null, error: null };
}

async function saveLead(data) {
  console.log('📊 Lead capturado:', data);
  return { data: null, error: null };
}

module.exports = {
  saveMessage,
  saveLead,
};
