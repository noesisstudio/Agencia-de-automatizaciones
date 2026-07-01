/**
 * crear-portal-pago — Función serverless de Vercel
 *
 * Crea una sesión del Stripe Customer Portal para el cliente que ha iniciado
 * sesión. Ahí el cliente puede actualizar su tarjeta, reintentar un pago fallido,
 * ver facturas o cancelar — es donde se resuelven las incidencias de pago.
 *
 * Flujo:
 *   1. El navegador envía el access_token de Supabase (Authorization: Bearer ...).
 *   2. Con ese token leemos SU suscripción en Supabase (la RLS garantiza que solo
 *      ve la suya) para obtener su stripe_customer_id.
 *   3. Pedimos a Stripe una URL de portal y la devolvemos al navegador.
 *
 * Variables de entorno (Vercel → Project settings → Environment variables):
 *   STRIPE_SECRET_KEY        sk_live_... (o sk_test_...)
 *   SUPABASE_URL             https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY        la anon/publishable key (pública)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'El portal de pagos no está configurado todavía.' });
  }

  // 1. Token de la sesión del cliente
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' });
  }

  // 2. Leer la suscripción del propio cliente (RLS limita a su fila)
  let stripeCustomerId = null;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/suscripciones?select=stripe_customer_id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (resp.status === 401) {
      return res.status(401).json({ error: 'Sesión caducada. Vuelve a iniciar sesión.' });
    }
    const rows = await resp.json();
    stripeCustomerId = Array.isArray(rows) && rows[0] ? rows[0].stripe_customer_id : null;
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(502).json({ error: 'No se pudo comprobar tu suscripción. Inténtalo más tarde.' });
  }

  if (!stripeCustomerId) {
    return res.status(404).json({
      error: 'No encontramos una suscripción con pago por Stripe. Escríbenos a info@bynoesis.com.',
    });
  }

  // 3. Crear la sesión del Customer Portal en Stripe
  const origin = req.headers.origin || 'https://www.bynoesis.com';
  const returnUrl = `${origin}/portal-dashboard.html`;
  try {
    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ customer: stripeCustomerId, return_url: returnUrl }).toString(),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Stripe error', resp.status, data?.error?.message);
      return res.status(502).json({ error: 'Stripe no pudo abrir el portal. Inténtalo más tarde.' });
    }
    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Error llamando a Stripe:', err.message);
    return res.status(502).json({ error: 'Error temporal al abrir el portal de pago.' });
  }
}
