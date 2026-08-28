-- Catálogo de Periodicidad (pedido 2026-08-28, punto 2) — mismo patrón que
-- empresas/ubicaciones (tabla independiente {id, nombre}, CRUD admin).
create table periodicidades (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

alter table periodicidades enable row level security;

create policy "periodicidades lectura autenticados" on periodicidades
  for select using (auth.role() = 'authenticated');
create policy "periodicidades escritura admin" on periodicidades
  for all using (is_admin()) with check (is_admin());

insert into periodicidades (nombre) values
  ('Anual'),
  ('Nuevo Servicio'),
  ('Extraordinario');

-- Campo de cabecera de la auto-evaluación, obligatorio a nivel UI (nullable
-- en BD por las filas ya existentes antes de este campo).
alter table autoevaluaciones add column periodicidad_id bigint references periodicidades(id);

create index on autoevaluaciones (periodicidad_id);
