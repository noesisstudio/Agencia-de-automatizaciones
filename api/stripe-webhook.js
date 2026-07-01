/**
 * stripe-webhook — Función serverless de Vercel
 *
 * Stripe llama a esta URL cuando pasa algo con un pago/suscripción. Aquí
 * mantenemos Supabase sincronizado para que el portal del cliente muestre el
 * estado real (sobre todo las INCIDENCIAS: pago fallido → "vencida"/"pausada").
 *
 * Eventos que conviene activar en Stripe (Developers → Webhooks):
 *   invoice.paid · invoice.payment_failed
 *   customer.subscription.updated · customer.subscription.deleted
 *
 * Variables de entorno (Vercel → Project settings → Environment variables):
 *   STRIPE_WEBHOOK_SECRET       whsec_...  (firma del endpoint)
 *   SUPABASE_URL                https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   service_role (SECRETO — solo servidor)
 */

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }
  if (!WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
    console.error('stripe-webhook sin configurar (faltan env vars)');
    return res.status(500).send('No configurado');
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'] || '';

  if (!verifyStripeSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(400).send('Firma no válida');
  }

  let evt;
  try {
    evt = JSON.parse(rawBody);
  } catch (_) {
    return res.status(400).send('JSON inválido');
  }

  try {
    const obj = evt.data && evt.data.object ? evt.data.object : {};
    switch (evt.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await onInvoice(obj, 'pagada');
        if (obj.customer) await patchSuscripcion({ stripe_customer_id: obj.customer }, { estado: 'activa' });
        break;

      case 'invoice.payment_failed':
        await onInvoice(obj, 'vencida');
        if (obj.customer) await patchSuscripcion({ stripe_customer_id: obj.customer }, { estado: 'pausada' });
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await onSubscription(obj, evt.type);
        break;

      default:
        // Evento no relevante: lo aceptamos para que Stripe no reintente.
        break;
    }
  } catch (err) {
    console.error('Error procesando webhook', evt.type, err.message);
    // 500 → Stripe reintentará el envío más tarde.
    return res.status(500).send('Error interno');
  }

  return res.status(200).json({ received: true });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ----------------------- Lógica por tipo de evento ----------------------- */

async function onSubscription(sub, type) {
  const estado =
    type === 'customer.subscription.deleted'
      ? 'cancelada'
      : mapSubStatus(sub.status);
  const fields = { estado };
  if (sub.current_period_end) {
    fields.fecha_proximo_cobro = unixToDate(sub.current_period_end);
  }
  await patchSuscripcion({ stripe_subscription_id: sub.id }, fields);
}

// Crea o actualiza la factura correspondiente a una invoice de Stripe.
async function onInvoice(inv, estado) {
  if (!inv.id) return;
  const fields = {
    estado,
    url_factura: inv.hosted_invoice_url || inv.invoice_pdf || null,
  };
  if (estado === 'pagada') {
    fields.fecha_pago = unixToDate(
      (inv.status_transitions && inv.status_transitions.paid_at) || inv.created
    );
  }

  // ¿Existe ya la factura por su id de Stripe?
  const existentes = await sbGet(
    `facturas?select=id&stripe_invoice_id=eq.${encodeURIComponent(inv.id)}&limit=1`
  );
  if (existentes.length > 0) {
    await sbPatch(`facturas?stripe_invoice_id=eq.${encodeURIComponent(inv.id)}`, fields);
    return;
  }

  // No existe → la creamos. Necesitamos el cliente_id (lo saca la suscripción).
  const cliente = inv.customer
    ? await sbGet(
        `suscripciones?select=cliente_id&stripe_customer_id=eq.${encodeURIComponent(inv.customer)}&limit=1`
      )
    : [];
  if (cliente.length === 0) return; // sin cliente conocido, no insertamos

  await sbInsert('facturas', {
    cliente_id: cliente[0].cliente_id,
    stripe_invoice_id: inv.id,
    concepto: (inv.lines && inv.lines.data && inv.lines.data[0] && inv.lines.data[0].description) || 'Suscripción Noesis',
    importe: ((inv.amount_due != null ? inv.amount_due : inv.amount_paid) || 0) / 100,
    metodo_pago: 'stripe',
    ...fields,
  });
}

function mapSubStatus(status) {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'activa';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'pausada';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelada';
    default:
      return 'pendiente';
  }
}

/* ----------------------------- Supabase REST ----------------------------- */

function sbHeaders(extra) {
  return Object.assign(
    {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    extra || {}
  );
}

async function sbGet(pathAndQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Supabase GET ${res.status}`);
  return res.json();
}

async function sbPatch(pathAndQuery, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}`);
}

async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${res.status}`);
}

async function patchSuscripcion(match, fields) {
  const [key, value] = Object.entries(match)[0];
  await sbPatch(`suscripciones?${key}=eq.${encodeURIComponent(value)}`, fields);
}

/* -------------------------- Firma de Stripe ------------------------------ */

function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=').map((s) => s.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  // Rechaza eventos con más de 5 minutos (anti-replay)
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${payload}`, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch (_) {
    return false;
  }
}

function unixToDate(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
}
