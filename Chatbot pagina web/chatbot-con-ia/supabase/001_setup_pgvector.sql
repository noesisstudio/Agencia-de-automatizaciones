-- Bot B — Setup inicial de Supabase
-- Ejecutar en el SQL Editor de Supabase (una sola vez por proyecto/cliente)
-- Supabase ya incluye pgvector, no hay que instalarlo manualmente.

-- 1. Activar la extensión de vectores
create extension if not exists vector;

-- 2. Tabla de fragmentos de conocimiento (RAG)
create table if not exists knowledge_chunks (
  id          bigserial primary key,
  tenant_id   text        not null,           -- ID del cliente (ej: "clinica-perez")
  content     text        not null,           -- Texto del fragmento
  embedding   vector(1536),                   -- Vector de embeddings (text-embedding-3-small)
  source      text,                           -- Origen del documento (ej: "faq.md")
  created_at  timestamptz default now()
);

-- Índice para búsqueda semántica rápida (HNSW — más rápido que IVFFlat para <1M filas)
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- Índice para filtrar por cliente
create index if not exists knowledge_chunks_tenant_idx
  on knowledge_chunks (tenant_id);

-- 3. Tabla de conversaciones (registro legal + análisis)
create table if not exists conversations (
  id          bigserial primary key,
  tenant_id   text        not null,
  session_id  text        not null,           -- ID único de sesión del usuario
  role        text        not null check (role in ('user', 'assistant')),
  content     text        not null,
  created_at  timestamptz default now()
);

create index if not exists conversations_tenant_session_idx
  on conversations (tenant_id, session_id);

create index if not exists conversations_created_at_idx
  on conversations (created_at);

-- 4. Tabla de leads capturados por el bot
create table if not exists leads (
  id          bigserial primary key,
  tenant_id   text        not null,
  session_id  text,
  nombre      text,
  email       text,
  telefono    text,
  consulta    text,
  created_at  timestamptz default now()
);

create index if not exists leads_tenant_idx on leads (tenant_id);

-- 5. Función de búsqueda semántica (llamada desde el backend con RPC)
create or replace function match_knowledge(
  p_tenant_id     text,
  query_embedding vector(1536),
  match_threshold float   default 0.7,
  match_count     int     default 5
)
returns table (
  id      bigint,
  content text,
  source  text,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.content,
    kc.source,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where
    kc.tenant_id = p_tenant_id
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. RLS (Row Level Security) — cada tenant solo ve sus propios datos
alter table knowledge_chunks  enable row level security;
alter table conversations      enable row level security;
alter table leads              enable row level security;

-- Política: el backend usa la service_role key (bypasa RLS)
-- Si en el futuro añades acceso directo desde el cliente, crea políticas por tenant.

-- 7. Borrado automático de conversaciones antiguas (RGPD — limitación del plazo)
-- Borra conversaciones con más de 12 meses de antigüedad.
-- Configurar como cron job en Supabase: Dashboard → Edge Functions → Cron
-- O ejecutar manualmente cada mes.
--
-- delete from conversations
-- where created_at < now() - interval '12 months';
--
-- delete from leads
-- where created_at < now() - interval '12 months';
