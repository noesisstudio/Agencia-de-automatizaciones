/**
 * Guarda cada mensaje en Supabase para:
 * - Registro legal (RGPD: poder demostrar qué dijo el bot)
 * - Análisis posterior (qué preguntas no supo responder)
 * - Reportes mensuales al cliente
 */

const supabase = require('./supabase');
const TENANT_ID = process.env.TENANT_ID;

async function saveMessage(sessionId, role, content) {
  const { error } = await supabase.from('conversations').insert({
    tenant_id: TENANT_ID,
    session_id: sessionId,
    role,
    content,
  });

  if (error) console.error('Error guardando mensaje:', error.message);
}

async function saveLead({ sessionId, nombre, email, telefono, consulta }) {
  const { error } = await supabase.from('leads').insert({
    tenant_id: TENANT_ID,
    session_id: sessionId,
    nombre,
    email,
    telefono,
    consulta,
  });

  if (error) console.error('Error guardando lead:', error.message);
}

module.exports = { saveMessage, saveLead };
