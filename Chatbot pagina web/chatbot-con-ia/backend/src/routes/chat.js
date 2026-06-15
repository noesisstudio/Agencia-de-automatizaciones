const express = require('express');
const router = express.Router();
const { searchFragments } = require('../services/knowledge-simple');
const { askClaude } = require('../services/claude');
const { buildSystemPrompt } = require('../services/systemPrompt');
const { saveMessage, saveLead } = require('../services/conversationStore');
const { extractLead, hasContactData } = require('../services/intentDetector');
const { enviarConfirmacionUsuario, notificarEquipo } = require('../services/email');

/**
 * POST /api/chat
 * Body: {
 *   sessionId: string,      — ID único de la sesión del usuario (generado en el widget)
 *   messages: [             — Historial completo de la conversación
 *     { role: 'user'|'assistant', content: string }
 *   ]
 * }
 */
router.post('/', async (req, res) => {
  const { sessionId, messages } = req.body;

  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'sessionId y messages son obligatorios' });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    return res.status(400).json({ error: 'El último mensaje debe ser del usuario' });
  }

  const userText = lastMessage.content;

  try {
    // 1. Buscar contexto relevante en la base de conocimiento
    const ragContext = searchFragments(userText);

    // 2. Construir el system prompt con el contexto
    const systemPrompt = buildSystemPrompt(ragContext);

    // 3. Llamar a Claude con el historial completo
    const reply = await askClaude(systemPrompt, messages);

    // 4. Guardar la conversación en Supabase (registro legal)
    await saveMessage(sessionId, 'user', userText);
    await saveMessage(sessionId, 'assistant', reply);

    // 5. Detectar si el usuario ha proporcionado datos de contacto
    const combinedText = `${userText} ${reply}`;
    if (hasContactData(combinedText)) {
      const { email, phone } = extractLead(combinedText);

      await saveLead({
        sessionId,
        email,
        telefono: phone,
        consulta: userText,
      });

      // Notificar al equipo y confirmar al usuario (en paralelo, sin bloquear la respuesta)
      Promise.all([
        enviarConfirmacionUsuario({ email }),
        notificarEquipo({ email, telefono: phone, consulta: userText }),
      ]).catch(err => console.error('Error enviando emails:', err.message));
    }

    res.json({ reply });

  } catch (err) {
    console.error('Error en /api/chat:', err.message);
    res.status(500).json({
      reply: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo o contacta directamente con nosotros.',
    });
  }
});

module.exports = router;
