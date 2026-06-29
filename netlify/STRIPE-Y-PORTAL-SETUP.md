# Portal de cliente + Stripe — puesta en marcha

El login y el portal (Supabase) ya funcionan. Esto activa los **pagos con Stripe**:
el cliente puede gestionar su suscripción y **resolver incidencias de pago** (tarjeta
caducada, reintentar cobro, cancelar), y el portal refleja el estado real.

## Qué se ha añadido

| Pieza | Archivo | Qué hace |
|---|---|---|
| Portal de pago | `netlify/functions/crear-portal-pago.js` | Crea una sesión del **Stripe Customer Portal** para el cliente con sesión iniciada y devuelve la URL. |
| Webhook | `netlify/functions/stripe-webhook.js` | Stripe avisa cuando un pago se cobra o **falla**; sincroniza `suscripciones`/`facturas` en Supabase. |
| Botón | `web/portal-data.js` | "Gestionar pago / Cancelar" ya llama a la función (antes era un aviso de placeholder). |

## 1. Variables de entorno en Netlify

Site settings → Environment variables:

| Variable | Valor | Usada por |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (o `sk_test_...` para probar) | crear-portal-pago |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (paso 3) | stripe-webhook |
| `SUPABASE_URL` | `https://zhvytwqvbtsenzwrsysi.supabase.co` | ambas |
| `SUPABASE_ANON_KEY` | la anon/publishable key (la pública de `supabase-config.js`) | crear-portal-pago |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (**secreto**, Supabase → Settings → API) | stripe-webhook |

> `URL` la pone Netlify sola (dominio del sitio); se usa como return_url del portal.

## 2. Activar el Customer Portal en Stripe

Stripe Dashboard → **Settings → Billing → Customer portal** → actívalo y guarda
(define qué puede hacer el cliente: cambiar método de pago, cancelar, ver facturas).
Sin esto, `billing_portal/sessions` da error.

## 3. Crear el webhook en Stripe

Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://TU_DOMINIO/.netlify/functions/stripe-webhook`
- Eventos a escuchar:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copia el **Signing secret** (`whsec_...`) → ponlo en `STRIPE_WEBHOOK_SECRET`.

## 4. Vincular cada cliente con su Stripe Customer

Para que el botón aparezca y el webhook sepa de quién es cada pago, la fila del
cliente en `suscripciones` debe tener su `stripe_customer_id` (y `stripe_subscription_id`):

```sql
update public.suscripciones
   set stripe_customer_id     = 'cus_...',
       stripe_subscription_id = 'sub_...'
 where cliente_id = 'UUID-del-usuario-en-auth.users';
```

(El UUID del cliente es el `id` de `auth.users` / la tabla `clientes`.)

## 5. Probar

1. `test mode` en Stripe + `sk_test_...`.
2. Inicia sesión en el portal con un cliente que tenga `stripe_customer_id`.
3. Pulsa "Gestionar pago / Cancelar" → debe abrir el portal de Stripe.
4. Simula un pago fallido (tarjeta `4000 0000 0000 0341`) → el webhook marca la
   suscripción como "pausada" y la factura como "vencida" en el portal.

## Notas de seguridad / RGPD

- `STRIPE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` viven **solo** en variables de
  entorno de Netlify, nunca en el código ni en git.
- El webhook verifica la **firma** de Stripe (rechaza peticiones falsas y reenvíos
  de más de 5 min).
- `crear-portal-pago` solo abre el portal del cliente autenticado (usa su token y la
  RLS de Supabase): nadie puede abrir el portal de otro.
