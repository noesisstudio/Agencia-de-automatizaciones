-- Tabla de clientes vinculada a Supabase Auth.
create table if not exists public.clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

drop policy if exists "Clientes pueden leer su propio perfil" on public.clientes;
create policy "Clientes pueden leer su propio perfil"
on public.clientes
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Clientes pueden actualizar su propio perfil" on public.clientes;
create policy "Clientes pueden actualizar su propio perfil"
on public.clientes
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clientes (id, email, nombre)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nombre = coalesce(excluded.nombre, public.clientes.nombre);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_cliente on auth.users;

create trigger on_auth_user_created_cliente
after insert on auth.users
for each row execute function public.handle_new_user_cliente();
