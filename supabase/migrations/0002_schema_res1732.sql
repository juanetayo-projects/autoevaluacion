-- Tabla maestra de la Res.1732: grupos, servicios genéricos y criterios.
-- Sembradas desde Autoevaluacion_Res1732_v3_Final.xlsx (hojas "Servicios"
-- y "AUTOEVALUACION 2026") — ver docs/habilitacion1732.md sección 4.

create table grupos_res1732 (
  id bigint generated always as identity primary key,
  numeral text not null unique,   -- '5' (universal) o '6.X'
  nombre text not null,
  descripcion text
);

create table servicios_res1732 (
  id bigint generated always as identity primary key,
  numeral text not null unique,   -- '5' (universal) o '6.X.Y'
  grupo_res1732_id bigint not null references grupos_res1732(id),
  nombre text not null,
  descripcion text,
  estructura text
);

create table criterios_res1732 (
  id bigint generated always as identity primary key,
  llave text not null,
  numero integer not null,
  item text,  -- algunas filas del Excel no traen este valor (ver seed)
  pagina text,
  criterio text not null,
  grupo_res1732_id bigint not null references grupos_res1732(id),
  servicio_res1732_id bigint not null references servicios_res1732(id),
  numeral_grupo text not null,
  numeral_servicio text not null,
  estandar text not null,
  complejidad text not null,
  modalidad text
);

comment on column criterios_res1732.pagina is
  'Texto, no numérico: el Excel trae valores tipo "21-22" (rango de páginas).';

create index on criterios_res1732 (servicio_res1732_id);
create index on criterios_res1732 (grupo_res1732_id);

alter table grupos_res1732 enable row level security;
alter table servicios_res1732 enable row level security;
alter table criterios_res1732 enable row level security;

create policy "grupos_res1732 lectura autenticados" on grupos_res1732
  for select using (auth.role() = 'authenticated');
create policy "grupos_res1732 escritura admin" on grupos_res1732
  for all using (is_admin()) with check (is_admin());

create policy "servicios_res1732 lectura autenticados" on servicios_res1732
  for select using (auth.role() = 'authenticated');
create policy "servicios_res1732 escritura admin" on servicios_res1732
  for all using (is_admin()) with check (is_admin());

create policy "criterios_res1732 lectura autenticados" on criterios_res1732
  for select using (auth.role() = 'authenticated');
create policy "criterios_res1732 escritura admin" on criterios_res1732
  for all using (is_admin()) with check (is_admin());
