-- Esquema para "Proveedores & cotizaciones" (Aural)
-- Pega TODO este archivo en Supabase: Panel del proyecto > SQL Editor > New query > Run

-- ---------- Tabla de proveedores ----------
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  category text,
  contact text,
  phone text,
  email text,
  city text,
  rut text,
  bank text,
  account_type text,
  account_number text,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Tabla de cotizaciones ----------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete set null,
  description text not null,
  amount numeric not null default 0,
  currency text not null default 'COP',
  quote_date date,
  file_path text,
  file_name text,
  file_type text,
  notes text,
  approved boolean not null default false,
  approved_date date,
  rut text,
  bank text,
  account_type text,
  account_number text,
  deposit_date date,
  deposit_paid boolean not null default false,
  deposit_sent date,
  deposit_acc_paid date,
  balance_date date,
  balance_paid boolean not null default false,
  balance_sent date,
  balance_acc_paid date,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Mantener updated_at al día ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_providers_updated_at on public.providers;
create trigger trg_providers_updated_at before update on public.providers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------- Seguridad: solo usuarios que iniciaron sesión pueden leer/escribir ----------
alter table public.providers enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "providers_all_authenticated" on public.providers;
create policy "providers_all_authenticated" on public.providers
  for all to authenticated using (true) with check (true);

drop policy if exists "quotes_all_authenticated" on public.quotes;
create policy "quotes_all_authenticated" on public.quotes
  for all to authenticated using (true) with check (true);

-- ---------- Almacenamiento para los PDF/imágenes de cotizaciones ----------
insert into storage.buckets (id, name, public)
values ('cotizaciones-files', 'cotizaciones-files', false)
on conflict (id) do nothing;

drop policy if exists "cotizaciones_files_insert" on storage.objects;
create policy "cotizaciones_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cotizaciones-files');

drop policy if exists "cotizaciones_files_select" on storage.objects;
create policy "cotizaciones_files_select" on storage.objects
  for select to authenticated using (bucket_id = 'cotizaciones-files');

drop policy if exists "cotizaciones_files_delete" on storage.objects;
create policy "cotizaciones_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cotizaciones-files');

-- Habilita en tiempo real (para que los cambios se vean al instante entre varias personas)
alter publication supabase_realtime add table public.providers;
alter publication supabase_realtime add table public.quotes;
