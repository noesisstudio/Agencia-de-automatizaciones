const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Llama a Claude con el historial completo de la conversación
 * y el contexto recuperado por RAG.
 *
 * @param {string} systemPrompt  - System prompt del cliente (con contexto RAG inyectado)
 * @param {Array}  messages      - Historial: [{role:'user'|'assistant', content:'...'}]
 * @returns {string}             - Respuesta del modelo
 */
async function askClaude(systemPrompt, messages) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Haiku: más rápido y barato para chatbots de atención
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
}

module.exports = { askClaude };
