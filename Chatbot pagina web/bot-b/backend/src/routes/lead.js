/**
 * POST /api/lead
 * Endpoint alternativo para guardar leads cuando el usuario
 * rellena un formulario explícito dentro del widget
 * (nombre + email + teléfono + mensaje).
 */

const express = require('express');
const router = express.Router();
const { saveLead } = require('../services/conversationStore');
const { enviarConfirmacionUsuario, notificarEquipo } = require('../services/email');

router.post('/', async (req, res) => {
  const { sessionId, nombre, email, telefono, consulta } = req.body;

  if (!email && !telefono) {
    return res.status(400).json({ error: 'Se requiere al menos email o teléfono' });
  }

  try {
    await saveLead({ sessionId, nombre, email, telefono, consulta });

    await Promise.all([
      enviarConfirmacionUsuario({ nombre, email }),
      notificarEquipo({ nombre, email, telefono, consulta }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en /api/lead:', err.message);
    res.status(500).json({ error: 'Error guardando el contacto' });
  }
});

module.exports = router;
