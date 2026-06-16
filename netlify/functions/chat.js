/**
 * Chatbot Noesis — Función serverless de Netlify
 *
 * Por qué existe esta función y no se llama a Claude desde el navegador:
 * la ANTHROPIC_API_KEY es secreta. Si estuviera en el JS del navegador,
 * cualquiera podría robarla. Esta función la guarda en el servidor de Netlify
 * y es el único sitio donde se usa.
 *
 * Como la base de conocimiento es pequeña, se inyecta entera en cada consulta.
 * Es más simple y más preciso que una búsqueda por palabras clave.
 */

const fs = require('fs');
const path = require('path');

// Carga el conocimiento una sola vez (se reutiliza entre invocaciones en caliente)
let KNOWLEDGE = '';
function getKnowledge() {
  if (KNOWLEDGE) return KNOWLEDGE;
  const candidates = [
    path.join(__dirname, 'noesis-conocimiento.md'),
    path.join(process.cwd(), 'netlify/functions/noesis-conocimiento.md'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        KNOWLEDGE = fs.readFileSync(p, 'utf-8');
        return KNOWLEDGE;
      }
    } catch (_) { /* sigue probando */ }
  }
  return '';
}

const SYSTEM_RULES = `
Eres el asistente virtual de Noesis.

IDENTIFICACIÓN (obligatoria por ley — no modificar):
Eres un sistema de inteligencia artificial, no una persona. Si te preguntan si
eres humano, responde siempre con honestidad que eres una IA.

COMPORTAMIENTO:
- Respondes siempre en español, de forma amable y concisa (máximo 3 párrafos cortos).
- Solo respondes sobre Noesis y sus servicios.
- Si el usuario escribe en otro idioma, responde en ese mismo idioma.
- Nunca hables de competidores.

ANTI-ALUCINACIONES (crítica — no modificar):
Si no tienes información confirmada sobre algo, di exactamente:
"No tengo información confirmada sobre eso. Te recomiendo consultarlo directamente con nuestro equipo en info@bynoesis.com."
Nunca inventes precios, fechas, condiciones o datos que no aparezcan en el CONOCIMIENTO.

INTERÉS COMERCIAL:
Si el usuario quiere contratar o pedir presupuesto, invítale amablemente a
escribir a info@bynoesis.com o a usar el formulario de contacto de la web.
`.trim();

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  // Acepta varios nombres de variable para evitar fallos de configuración.
  // Recomendado: ANTHROPIC_API_KEY. También vale 'anthropic' o 'ANTHROPIC'.
  const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.anthropic || process.env.ANTHROPIC;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: 'El asistente no está configurado todavía. Escríbenos a info@bynoesis.com.' }),
    };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body || '{}'));
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages es obligatorio' }) };
  }

  // Limita el historial para controlar coste y latencia
  const recent = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10);

  const system = `${SYSTEM_RULES}\n\nCONOCIMIENTO DE NOESIS (úsalo para responder):\n${getKnowledge()}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system,
        messages: recent,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Anthropic error', res.status, detail);
      return {
        statusCode: 200,
        body: JSON.stringify({ reply: 'Ahora mismo no puedo responder. Inténtalo en un momento o escríbenos a info@bynoesis.com.' }),
      };
    }

    const data = await res.json();
    const reply = data?.content?.[0]?.text || 'No he podido generar una respuesta.';
    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (err) {
    console.error('Error llamando a Claude:', err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: 'Ha ocurrido un error temporal. Inténtalo de nuevo, por favor.' }),
    };
  }
};
