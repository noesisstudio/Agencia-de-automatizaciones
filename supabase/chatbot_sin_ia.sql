-- =====================================================
-- TABLA: tenants (las empresas clientes)
-- =====================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                          -- "Panadería López"
  phone_number_id text not null unique,          -- ID de Meta WhatsApp del cliente
  meta_access_token text not null,               -- Token permanente de Meta
  mensaje_bienvenida text default '¡Hola! ¿En qué puedo ayudarte?',
  mensaje_fallback text default 'No he entendido tu mensaje. ¿Puedes reformularlo?',
  email_contacto text,
  telefono_contacto text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================
-- TABLA: respuestas (las respuestas por palabras clave)
-- =====================================================
create table if not exists public.respuestas (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  palabras_clave text not null,                  -- "horario, abrís, abierto, hora"
  respuesta text not null,                       -- "Abrimos de L a S de 7 a 14h"
  prioridad int not null default 0,              -- Más alto = se evalúa primero
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_respuestas_tenant on public.respuestas(tenant_id);

-- =====================================================
-- TABLA: conversaciones (registro / log)
-- =====================================================
create table if not exists public.conversaciones (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  telefono text not null,
  nombre text,
  mensaje text not null,
  respuesta text not null,
  tipo text not null default 'bd',               -- 'bd', 'fallback', 'humano'
  created_at timestamptz not null default now()
);

create index if not exists idx_conversaciones_tenant on public.conversaciones(tenant_id);
create index if not exists idx_conversaciones_fecha on public.conversaciones(created_at);

-- =====================================================
-- TABLA: leads (oportunidades comerciales - opcional)
-- =====================================================
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  telefono text not null,
  nombre text,
  interes text,
  created_at timestamptz not null default now()
);

-- =====================================================
-- Seguridad: Row Level Security (RLS)
-- =====================================================
alter table public.tenants enable row level security;
alter table public.respuestas enable row level security;
alter table public.conversaciones enable row level security;
alter table public.leads enable row level security;

-- Políticas: n8n usa la service_role key (bypass RLS),
-- pero si un cliente accede por API, solo ve sus datos.
drop policy if exists "Tenants ven su propio perfil" on public.tenants;
create policy "Tenants ven su propio perfil" on public.tenants
  for select to authenticated
  using (id = auth.uid()::uuid);

drop policy if exists "Respuestas del propio tenant" on public.respuestas;
create policy "Respuestas del propio tenant" on public.respuestas
  for all to authenticated
  using (tenant_id = auth.uid()::uuid);

drop policy if exists "Conversaciones del propio tenant" on public.conversaciones;
create policy "Conversaciones del propio tenant" on public.conversaciones
  for all to authenticated
  using (tenant_id = auth.uid()::uuid);

drop policy if exists "Leads del propio tenant" on public.leads;
create policy "Leads del propio tenant" on public.leads
  for all to authenticated
  using (tenant_id = auth.uid()::uuid);
