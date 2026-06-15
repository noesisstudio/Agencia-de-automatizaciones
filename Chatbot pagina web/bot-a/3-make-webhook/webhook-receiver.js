/**
 * Bot A — Receptor de webhook para Make.com
 *
 * Contexto: Voiceflow envía los datos del lead a Make.com mediante un webhook
 * personalizado. Si el cliente ya usa Railway/Render para otro servicio,
 * este receptor puede actuar como capa de validación + reenvío antes de Make.
 * Si Voiceflow conecta directamente con Make, este fichero NO es necesario.
 *
 * Despliegue: Railway → New Project → Deploy from repo → variable PORT automática.
 * Variables de entorno requeridas:
 *   WEBHOOK_SECRET   — token secreto que Voiceflow envía en la cabecera X-Webhook-Secret
 *   MAKE_WEBHOOK_URL — URL del webhook de Make.com donde se reenvían los datos
 *   PORT             — Railway lo asigna automáticamente (no configurar manualmente)
 */

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || '';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function forwardToMake(payload) {
  return new Promise((resolve, reject) => {
    if (!MAKE_WEBHOOK_URL) return resolve({ skipped: true });

    const body = JSON.stringify(payload);
    const url = new URL(MAKE_WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Servidor ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Health check para Railway / Render
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'bot-a-webhook' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook/voiceflow') {
    // Validar secret si está configurado
    if (WEBHOOK_SECRET) {
      const received = req.headers['x-webhook-secret'] || '';
      if (received !== WEBHOOK_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    let rawBody;
    try {
      rawBody = await readBody(req);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Bad request' }));
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido' }));
      return;
    }

    // Normalizar campos que envía Voiceflow
    // Adaptar según las variables que captures en el flujo de Voiceflow
    const lead = {
      nombre:     payload.nombre    || payload.name   || '',
      email:      payload.email     || '',
      telefono:   payload.telefono  || payload.phone  || '',
      consulta:   payload.consulta  || payload.query  || '',
      tenant:     payload.tenant    || 'default',
      timestamp:  new Date().toISOString(),
      fuente:     'bot-a-voiceflow',
    };

    console.log(`[webhook] lead recibido: ${lead.email || lead.telefono || 'sin contacto'}`);

    // Reenviar a Make.com
    try {
      const makeResult = await forwardToMake(lead);
      console.log(`[webhook] Make.com respondió: ${JSON.stringify(makeResult)}`);
    } catch (err) {
      console.error(`[webhook] Error al enviar a Make: ${err.message}`);
      // Respondemos 200 a Voiceflow igualmente para que no reintente
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Bot A webhook receiver escuchando en puerto ${PORT}`);
  if (!WEBHOOK_SECRET) console.warn('AVISO: WEBHOOK_SECRET no configurado — endpoint sin protección');
  if (!MAKE_WEBHOOK_URL) console.warn('AVISO: MAKE_WEBHOOK_URL no configurado — reenvío a Make desactivado');
});
