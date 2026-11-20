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
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'providers'
  ) then
    alter publication supabase_realtime add table public.providers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quotes'
  ) then
    alter publication supabase_realtime add table public.quotes;
  end if;
end $$;

-- ---------- ACTUALIZACIÓN: valor realmente pagado y anotaciones ----------
-- Si ya habías creado las tablas antes (ya tenías el sitio funcionando), entra a
-- Supabase > SQL Editor > New query, pega SOLO este bloque de aquí hacia abajo y dale Run.
-- No borra ni daña nada de lo que ya tienes.
alter table public.quotes add column if not exists deposit_amount_paid numeric;
alter table public.quotes add column if not exists balance_amount_paid numeric;
alter table public.quotes add column if not exists annotations jsonb not null default '[]'::jsonb;
alter table public.quotes add column if not exists deposit_receipt_path text;
alter table public.quotes add column if not exists deposit_receipt_name text;
alter table public.quotes add column if not exists deposit_receipt_type text;
alter table public.quotes add column if not exists balance_receipt_path text;
alter table public.quotes add column if not exists balance_receipt_name text;
alter table public.quotes add column if not exists balance_receipt_type text;
alter table public.providers add column if not exists rut_file_path text;
alter table public.providers add column if not exists rut_file_name text;
alter table public.providers add column if not exists rut_file_type text;
alter table public.providers add column if not exists bank_file_path text;
alter table public.providers add column if not exists bank_file_name text;
alter table public.providers add column if not exists bank_file_type text;

-- ======================================================================
-- FASE 2: MARKETING (proyectos de diseño/video, plan de contenidos,
-- calendario y banco de imágenes).
-- Pega este bloque completo en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo varias veces, y no afecta nada de lo que ya existe.
-- ======================================================================

create table if not exists public.creative_projects (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('diseno','video')),
  name text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','en_proceso','revision','terminado')),
  assignee text,
  due_date date,
  priority text check (priority in ('alta','media','baja')),
  link_url text,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_plan (
  id uuid primary key default gen_random_uuid(),
  platform text,
  content_type text,
  publish_date date,
  status text not null default 'idea' check (status in ('idea','en_diseno','programado','publicado')),
  assignee text,
  copy_text text,
  link_url text,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  description text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.image_bank (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text,
  file_path text,
  file_name text,
  file_type text,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creative_projects_updated_at on public.creative_projects;
create trigger trg_creative_projects_updated_at before update on public.creative_projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_plan_updated_at on public.content_plan;
create trigger trg_content_plan_updated_at before update on public.content_plan
  for each row execute function public.set_updated_at();

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_image_bank_updated_at on public.image_bank;
create trigger trg_image_bank_updated_at before update on public.image_bank
  for each row execute function public.set_updated_at();

alter table public.creative_projects enable row level security;
alter table public.content_plan enable row level security;
alter table public.calendar_events enable row level security;
alter table public.image_bank enable row level security;

drop policy if exists "creative_projects_all_authenticated" on public.creative_projects;
create policy "creative_projects_all_authenticated" on public.creative_projects
  for all to authenticated using (true) with check (true);

drop policy if exists "content_plan_all_authenticated" on public.content_plan;
create policy "content_plan_all_authenticated" on public.content_plan
  for all to authenticated using (true) with check (true);

drop policy if exists "calendar_events_all_authenticated" on public.calendar_events;
create policy "calendar_events_all_authenticated" on public.calendar_events
  for all to authenticated using (true) with check (true);

drop policy if exists "image_bank_all_authenticated" on public.image_bank;
create policy "image_bank_all_authenticated" on public.image_bank
  for all to authenticated using (true) with check (true);

-- Banco de imágenes: bucket público (son imágenes de marketing, no datos
-- sensibles) para que las miniaturas carguen rápido sin pedir una URL
-- firmada por cada una.
insert into storage.buckets (id, name, public)
values ('banco-imagenes', 'banco-imagenes', true)
on conflict (id) do nothing;

drop policy if exists "banco_imagenes_insert" on storage.objects;
create policy "banco_imagenes_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'banco-imagenes');

drop policy if exists "banco_imagenes_select" on storage.objects;
create policy "banco_imagenes_select" on storage.objects
  for select using (bucket_id = 'banco-imagenes');

drop policy if exists "banco_imagenes_delete" on storage.objects;
create policy "banco_imagenes_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'banco-imagenes');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'creative_projects'
  ) then
    alter publication supabase_realtime add table public.creative_projects;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'content_plan'
  ) then
    alter publication supabase_realtime add table public.content_plan;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events'
  ) then
    alter publication supabase_realtime add table public.calendar_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'image_bank'
  ) then
    alter publication supabase_realtime add table public.image_bank;
  end if;
end $$;

-- ======================================================================
-- FASE 3: FORMULARIO PÚBLICO DE SOLICITUD DE PIEZAS (solicitar.html)
-- Pega este bloque en Supabase > SQL Editor > New query > Run.
-- Permite que cualquier persona de la empresa, SIN iniciar sesión, pueda
-- crear una solicitud (cae como tarjeta nueva en "Por hacer" del tablero
-- de diseño o de video). Solo se le da permiso de CREAR — nunca de leer,
-- editar ni borrar — así que no puede ver ni tocar las demás tarjetas.
-- ======================================================================

alter table public.creative_projects add column if not exists requested_by text;
alter table public.creative_projects add column if not exists requested_area text;
alter table public.creative_projects add column if not exists source text;

drop policy if exists "creative_projects_public_insert" on public.creative_projects;
create policy "creative_projects_public_insert" on public.creative_projects
  for insert to anon
  with check (kind in ('diseno','video') and status = 'todo');
