-- Módulo "Novedades" (Res.3100, cap. 10.5): se activa cuando una
-- auto-evaluación queda `habilitada = true`. Un registro de "habilitación"
-- por auto-evaluación (1:1) captura el contexto de esa revisión (fechas,
-- auditor(es), evaluado(s), observaciones, adjuntos) y de ahí cuelga el
-- checklist de requisitos (novedades_res3100_catalogo) con su calificación
-- cumple/no_cumple/no_aplica + comentario por fila.

create table habilitaciones_novedades (
  id uuid primary key default gen_random_uuid(),
  autoevaluacion_id uuid not null unique references autoevaluaciones(id) on delete cascade,
  fecha_inicio date not null,
  fecha_final date not null,
  -- "uno o varios auditores" / "uno o varias personas evaluadas": nombres
  -- libres en lugar de FK a profiles, porque el auditor o el evaluado no
  -- siempre tiene usuario en la app (ej. personal externo o del prestador).
  auditores text[] not null default '{}',
  evaluados text[] not null default '{}',
  observaciones text,
  modo_visualizacion text not null default 'novedad'
    check (modo_visualizacion in ('item', 'novedad')),
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index on habilitaciones_novedades (autoevaluacion_id);

create trigger trg_habilitaciones_novedades_actualizado_en
  before update on habilitaciones_novedades
  for each row execute function set_actualizado_en();

create table habilitaciones_novedades_adjuntos (
  id bigint generated always as identity primary key,
  habilitacion_id uuid not null references habilitaciones_novedades(id) on delete cascade,
  nombre_archivo text not null,
  ruta text not null,
  subido_por uuid references profiles(id),
  subido_en timestamptz not null default now()
);

create index on habilitaciones_novedades_adjuntos (habilitacion_id);

create table novedades_respuestas (
  id bigint generated always as identity primary key,
  habilitacion_id uuid not null references habilitaciones_novedades(id) on delete cascade,
  catalogo_id bigint not null references novedades_res3100_catalogo(id),
  respuesta text check (respuesta in ('cumple', 'no_cumple', 'no_aplica')),
  comentario text,
  actualizado_en timestamptz not null default now(),
  unique (habilitacion_id, catalogo_id)
);

create index on novedades_respuestas (habilitacion_id);

create trigger trg_novedades_respuestas_actualizado_en
  before update on novedades_respuestas
  for each row execute function set_actualizado_en();

alter table habilitaciones_novedades enable row level security;
alter table habilitaciones_novedades_adjuntos enable row level security;
alter table novedades_respuestas enable row level security;

-- Mismo criterio permisivo que autoevaluaciones_respuestas/compromisos: todo
-- usuario autenticado puede leer y diligenciar el checklist de Novedades.
create policy "habilitaciones_novedades lectura autenticados" on habilitaciones_novedades
  for select using (auth.role() = 'authenticated');
create policy "habilitaciones_novedades escritura autenticados" on habilitaciones_novedades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "habilitaciones_novedades_adjuntos lectura autenticados" on habilitaciones_novedades_adjuntos
  for select using (auth.role() = 'authenticated');
create policy "habilitaciones_novedades_adjuntos escritura autenticados" on habilitaciones_novedades_adjuntos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "novedades_respuestas lectura autenticados" on novedades_respuestas
  for select using (auth.role() = 'authenticated');
create policy "novedades_respuestas escritura autenticados" on novedades_respuestas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('novedades-adjuntos', 'novedades-adjuntos', false)
on conflict (id) do nothing;

create policy "novedades_adjuntos lectura autenticados" on storage.objects
  for select using (bucket_id = 'novedades-adjuntos' and auth.role() = 'authenticated');
create policy "novedades_adjuntos escritura autenticados" on storage.objects
  for insert with check (bucket_id = 'novedades-adjuntos' and auth.role() = 'authenticated');
