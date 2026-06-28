-- =====================================================
-- Chatbot CON IA — clave de Anthropic POR CLIENTE
-- =====================================================
-- Migración additiva sobre el esquema multi-tenant del bot SIN IA
-- (supabase/chatbot_sin_ia.sql). Ejecútala DESPUÉS de aquél.
--
-- Idea: cada cliente (fila de `tenants`) tiene SU PROPIA clave de Anthropic,
-- su modelo y su conocimiento. El workflow de n8n busca el tenant por
-- phone_number_id y usa esos valores. Así no hay ninguna clave en n8n ni en git.
--
-- RGPD / seguridad:
--   • anthropic_api_key y meta_access_token son SECRETOS. Solo los lee n8n con la
--     clave service_role (servidor). Nunca se exponen con la clave anon (navegador).
--   • La RLS de `tenants` (ya activada en chatbot_sin_ia.sql) impide que un cliente
--     vea los datos de otro.
--   • Aloja el proyecto Supabase en una región de la UE (p. ej. Frankfurt) para
--     residencia de datos: las `conversaciones` contienen teléfono y texto = dato
--     personal.
-- =====================================================

-- 1) Columnas nuevas en tenants (no toca las existentes)
alter table public.tenants
  add column if not exists anthropic_api_key text,                       -- secreto, por cliente
  add column if not exists anthropic_model   text not null default 'claude-sonnet-4-6',
  add column if not exists conocimiento      text;                       -- base de conocimiento del cliente

comment on column public.tenants.anthropic_api_key is
  'Clave de Anthropic del cliente. SECRETO: solo accesible vía service_role (n8n).';
comment on column public.tenants.anthropic_model is
  'Modelo Claude para este cliente. Por defecto claude-sonnet-4-6.';
comment on column public.tenants.conocimiento is
  'Conocimiento del negocio (se inyecta como CONOCIMIENTO en el system prompt).';

-- 2) Endurecer: que la clave anon NO pueda leer los secretos.
--    Las políticas RLS de chatbot_sin_ia.sql usan auth.uid(); el service_role que
--    usa n8n las salta (lee todo). Para evitar fugas vía clave anon/authenticated,
--    revocamos el acceso de columnas secretas a esos roles:
revoke select (anthropic_api_key, meta_access_token) on public.tenants from anon, authenticated;

-- 3) (Opcional, recomendado) cifrado en reposo con Supabase Vault.
--    Si activas la extensión Vault puedes guardar las claves cifradas y referenciarlas
--    por id en lugar de en texto plano. Para empezar no es obligatorio; la columna de
--    texto + RLS + revoke de arriba ya es un nivel correcto. Descomenta si lo usas:
-- create extension if not exists supabase_vault;
-- -- guarda un secreto:  select vault.create_secret('sk-ant-...', 'anthropic_key_panaderia');
-- -- y en tenants guardarías el id del secreto en vez de la clave.

-- =====================================================
-- Alta de un cliente nuevo (ejemplo) — todo en una fila:
-- =====================================================
-- insert into public.tenants (nombre, phone_number_id, meta_access_token,
--                             anthropic_api_key, anthropic_model, conocimiento)
-- values (
--   'Panadería López',
--   '123456789012345',                 -- phone_number_id de Meta de ESTE cliente
--   'EAA... (token permanente de Meta de este cliente)',
--   'sk-ant-... (clave Anthropic de este cliente)',
--   'claude-sonnet-4-6',
--   '## Sobre la empresa
-- Panadería artesana en Barcelona desde 1990.
-- ## Horario
-- Lunes a sábado 7:00-14:00 y 17:00-20:00. Domingos cerrado.
-- ## Productos
-- Pan de masa madre, bollería y tartas por encargo.'
-- );
--
-- Cambiar la clave de un cliente:
-- update public.tenants set anthropic_api_key = 'sk-ant-NUEVA'
--   where phone_number_id = '123456789012345';
