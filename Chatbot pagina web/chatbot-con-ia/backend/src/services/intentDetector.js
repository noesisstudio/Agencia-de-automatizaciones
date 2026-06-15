/**
 * Detecta si la respuesta del bot o el mensaje del usuario
 * contiene datos de contacto (lead) para guardarlos y notificar al equipo.
 * No usa IA — solo regex. Rápido y sin coste adicional.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+34|0034)?[\s\-]?[6789]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}/;

function extractLead(text) {
  const email = (text.match(EMAIL_RE) || [])[0] || null;
  const phone = (text.match(PHONE_RE) || [])[0] || null;
  return { email, phone };
}

function hasContactData(text) {
  return EMAIL_RE.test(text) || PHONE_RE.test(text);
}

module.exports = { extractLead, hasContactData };
