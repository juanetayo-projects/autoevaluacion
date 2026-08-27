-- Catálogos base: empresas, sedes, perfiles de usuario, permisos por módulo.

create table empresas (
  id bigint generated always as identity primary key,
  nombre text not null
);

create table sedes (
  id bigint generated always as identity primary key,
  empresa_id bigint not null references empresas(id),
  nombre text not null
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  role text not null default 'auditor' check (role in ('admin', 'coordinador', 'auditor')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Sin filas para un profile_id = ve todos los módulos (default de hoy).
-- Catálogo de módulos válidos vive en el frontend (src/domain/modulosApp.ts).
create table permisos_modulo (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  modulo text not null,
  unique (profile_id, modulo)
);

create or replace function is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table empresas enable row level security;
alter table sedes enable row level security;
alter table profiles enable row level security;
alter table permisos_modulo enable row level security;

create policy "empresas lectura autenticados" on empresas
  for select using (auth.role() = 'authenticated');
create policy "empresas escritura admin" on empresas
  for all using (is_admin()) with check (is_admin());

create policy "sedes lectura autenticados" on sedes
  for select using (auth.role() = 'authenticated');
create policy "sedes escritura admin" on sedes
  for all using (is_admin()) with check (is_admin());

create policy "profiles lectura autenticados" on profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles escritura admin" on profiles
  for all using (is_admin()) with check (is_admin());
create policy "profiles propio update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "permisos_modulo lectura autenticados" on permisos_modulo
  for select using (auth.role() = 'authenticated');
create policy "permisos_modulo escritura admin" on permisos_modulo
  for all using (is_admin()) with check (is_admin());

insert into empresas (nombre) values ('CACSB');

insert into sedes (empresa_id, nombre)
select id, s.nombre from empresas, (values ('Torre'), ('Urgencias'), ('Centro de Especialistas')) as s(nombre)
where empresas.nombre = 'CACSB';
