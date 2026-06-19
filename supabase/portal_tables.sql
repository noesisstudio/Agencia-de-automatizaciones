-- =====================================================
-- Portal de clientes Noesis — Tablas dinámicas
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- =====================================================

-- =====================================================
-- TABLA: suscripciones (enlazada con Stripe)
-- =====================================================
create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,              -- "cus_xxx" de Stripe
  stripe_subscription_id text,          -- "sub_xxx" de Stripe
  plan text not null,                   -- "basico", "profesional", "premium"
  precio_mensual numeric(10,2) not null,
  estado text not null default 'activa', -- 'activa', 'cancelada', 'pausada', 'pendiente'
  fecha_inicio date not null default current_date,
  fecha_proximo_cobro date,
  created_at timestamptz not null default now()
);

-- =====================================================
-- TABLA: facturas
-- =====================================================
create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text,               -- "in_xxx" de Stripe (null si es transferencia)
  concepto text not null,               -- "Mantenimiento junio 2026"
  importe numeric(10,2) not null,
  estado text not null default 'pendiente', -- 'pendiente', 'pagada', 'vencida'
  metodo_pago text default 'stripe',    -- 'stripe', 'transferencia'
  fecha_emision date not null default current_date,
  fecha_pago date,                      -- null si no pagada aún
  url_factura text,                     -- Link al PDF de Stripe o propio
  created_at timestamptz not null default now()
);

-- =====================================================
-- TABLA: tickets (incidencias / soporte)
-- =====================================================
create table if not exists public.tickets (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references auth.users(id) on delete cascade,
  asunto text not null,
  descripcion text not null,
  estado text not null default 'abierto', -- 'abierto', 'en_proceso', 'resuelto', 'cerrado'
  prioridad text not null default 'normal', -- 'baja', 'normal', 'alta', 'urgente'
  respuesta_noesis text,                -- Respuesta del equipo Noesis
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- TABLA: actividad (timeline de eventos del cliente)
-- =====================================================
create table if not exists public.actividad (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,            -- "Revisión del flujo completada"
  tipo text default 'general',          -- 'general', 'factura', 'servicio', 'soporte'
  created_at timestamptz not null default now()
);

-- =====================================================
-- Índices para rendimiento
-- =====================================================
create index if not exists idx_suscripciones_cliente on public.suscripciones(cliente_id);
create index if not exists idx_facturas_cliente on public.facturas(cliente_id);
create index if not exists idx_facturas_estado on public.facturas(estado);
create index if not exists idx_tickets_cliente on public.tickets(cliente_id);
create index if not exists idx_tickets_estado on public.tickets(estado);
create index if not exists idx_actividad_cliente on public.actividad(cliente_id);
create index if not exists idx_actividad_fecha on public.actividad(fecha desc);

-- =====================================================
-- Row Level Security (cada cliente solo ve sus datos)
-- =====================================================
alter table public.suscripciones enable row level security;
alter table public.facturas enable row level security;
alter table public.tickets enable row level security;
alter table public.actividad enable row level security;

-- Suscripciones: lectura propia
drop policy if exists "Cliente lee sus suscripciones" on public.suscripciones;
create policy "Cliente lee sus suscripciones" on public.suscripciones
  for select to authenticated using (cliente_id = auth.uid());

-- Facturas: lectura propia
drop policy if exists "Cliente lee sus facturas" on public.facturas;
create policy "Cliente lee sus facturas" on public.facturas
  for select to authenticated using (cliente_id = auth.uid());

-- Tickets: lectura y creación propias
drop policy if exists "Cliente lee sus tickets" on public.tickets;
create policy "Cliente lee sus tickets" on public.tickets
  for select to authenticated using (cliente_id = auth.uid());

drop policy if exists "Cliente crea tickets" on public.tickets;
create policy "Cliente crea tickets" on public.tickets
  for insert to authenticated with check (cliente_id = auth.uid());

-- Actividad: lectura propia
drop policy if exists "Cliente lee su actividad" on public.actividad;
create policy "Cliente lee su actividad" on public.actividad
  for select to authenticated using (cliente_id = auth.uid());
