const fs = require('fs');
const path = require('path');

let KNOWLEDGE = '';
function getKnowledge() {
  if (KNOWLEDGE) return KNOWLEDGE;
  const candidates = [
    path.join(__dirname, '../netlify/functions/noesis-conocimiento.md'),
    path.join(process.cwd(), 'netlify/functions/noesis-conocimiento.md'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        KNOWLEDGE = fs.readFileSync(p, 'utf-8');
        return KNOWLEDGE;
      }
    } catch (_) {}
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.anthropic || process.env.ANTHROPIC;

  if (!API_KEY) {
    return res.status(200).json({ reply: 'El asistente no está configurado todavía. Escríbenos a info@bynoesis.com.' });
  }

  let messages;
  try {
    messages = req.body?.messages;
    if (typeof req.body === 'string') {
      messages = JSON.parse(req.body).messages;
    }
  } catch (_) {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages es obligatorio' });
  }

  const recent = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10);

  const system = `${SYSTEM_RULES}\n\nCONOCIMIENTO DE NOESIS (úsalo para responder):\n${getKnowledge()}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic error', response.status, detail);
      return res.status(200).json({ reply: 'Ahora mismo no puedo responder. Inténtalo en un momento o escríbenos a info@bynoesis.com.' });
    }

    const data = await response.json();
    const reply = data?.content?.[0]?.text || 'No he podido generar una respuesta.';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Error llamando a Claude:', err.message);
    return res.status(200).json({ reply: 'Ha ocurrido un error temporal. Inténtalo de nuevo, por favor.' });
  }
}
