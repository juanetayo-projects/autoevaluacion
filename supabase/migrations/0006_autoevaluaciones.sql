-- Auto-evaluaciones: cabecera + respuestas (formato largo, una fila por
-- criterio respondido). Ver docs/habilitacion1732.md sección 6.

create table autoevaluaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint not null references empresas(id),
  sede_id bigint not null references sedes(id),
  lugar text,
  fecha date not null default current_date,
  usuario_id uuid not null references profiles(id),
  servicio_habilitado_id bigint not null references servicios_habilitados(id),
  grupo_filtro text,
  modalidad_filtro text,
  complejidad_filtro text,
  estado text not null default 'borrador' check (estado in ('borrador', 'finalizada')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index on autoevaluaciones (usuario_id);
create index on autoevaluaciones (servicio_habilitado_id);
create index on autoevaluaciones (estado);

create table autoevaluaciones_respuestas (
  id bigint generated always as identity primary key,
  autoevaluacion_id uuid not null references autoevaluaciones(id) on delete cascade,
  criterio_id bigint not null references criterios_res1732(id),
  respuesta text not null check (respuesta in ('cumple', 'no_cumple', 'no_aplica')),
  observacion text,
  respondido_en timestamptz not null default now(),
  unique (autoevaluacion_id, criterio_id)
);

create index on autoevaluaciones_respuestas (autoevaluacion_id);
create index on autoevaluaciones_respuestas (respuesta);

create or replace function set_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger trg_autoevaluaciones_actualizado_en
  before update on autoevaluaciones
  for each row execute function set_actualizado_en();

alter table autoevaluaciones enable row level security;
alter table autoevaluaciones_respuestas enable row level security;

-- Fase inicial (docs sección 9): todos los roles autenticados ven/editan
-- todas las auto-evaluaciones, sin importar quién las creó. `permisos_modulo`
-- queda listo para restringir esto por módulo más adelante sin migración.
create policy "autoevaluaciones lectura autenticados" on autoevaluaciones
  for select using (auth.role() = 'authenticated');
create policy "autoevaluaciones escritura autenticados" on autoevaluaciones
  for insert with check (auth.role() = 'authenticated');
create policy "autoevaluaciones update autenticados" on autoevaluaciones
  for update using (auth.role() = 'authenticated');
create policy "autoevaluaciones delete admin" on autoevaluaciones
  for delete using (is_admin());

create policy "respuestas lectura autenticados" on autoevaluaciones_respuestas
  for select using (auth.role() = 'authenticated');
create policy "respuestas escritura autenticados" on autoevaluaciones_respuestas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
