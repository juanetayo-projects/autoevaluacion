-- Tabla maestra de la Res.3100: grupos, servicios genéricos y criterios.
-- Sembradas desde docs/Autoevaluacion_Res3100_v1.xlsx (hojas "Servicios" y
-- "AUTOEVALUACION 3100") — mismo patrón que 0002_schema_res1732.sql.

create table grupos_res3100 (
  id bigint generated always as identity primary key,
  numeral text not null unique,   -- '11.1' (universal) o '11.X'
  nombre text not null,
  descripcion text
);

create table servicios_res3100 (
  id bigint generated always as identity primary key,
  numeral text not null unique,   -- '11.1' (universal) o '11.X.Y'
  grupo_res3100_id bigint not null references grupos_res3100(id),
  nombre text not null,
  descripcion text,
  estructura text
);

create table criterios_res3100 (
  id bigint generated always as identity primary key,
  llave text not null,
  numero integer not null,
  item text,
  pagina integer,
  criterio text not null,
  grupo_res3100_id bigint not null references grupos_res3100(id),
  servicio_res3100_id bigint not null references servicios_res3100(id),
  numeral_grupo text not null,
  numeral_servicio text not null,
  estandar text not null,
  complejidad text not null,
  modalidad text
);

create index on criterios_res3100 (servicio_res3100_id);
create index on criterios_res3100 (grupo_res3100_id);

alter table grupos_res3100 enable row level security;
alter table servicios_res3100 enable row level security;
alter table criterios_res3100 enable row level security;

create policy "grupos_res3100 lectura autenticados" on grupos_res3100
  for select using (auth.role() = 'authenticated');
create policy "grupos_res3100 escritura admin" on grupos_res3100
  for all using (is_admin()) with check (is_admin());

create policy "servicios_res3100 lectura autenticados" on servicios_res3100
  for select using (auth.role() = 'authenticated');
create policy "servicios_res3100 escritura admin" on servicios_res3100
  for all using (is_admin()) with check (is_admin());

create policy "criterios_res3100 lectura autenticados" on criterios_res3100
  for select using (auth.role() = 'authenticated');
create policy "criterios_res3100 escritura admin" on criterios_res3100
  for all using (is_admin()) with check (is_admin());
