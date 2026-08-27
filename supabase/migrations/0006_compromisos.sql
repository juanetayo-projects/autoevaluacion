-- Plan de acción de cierre: un compromiso obligatorio por cada respuesta
-- "no_cumple". Ver docs/habilitacion1732.md sección 6.5.

create table autoevaluaciones_compromisos (
  id bigint generated always as identity primary key,
  autoevaluacion_id uuid not null references autoevaluaciones(id) on delete cascade,
  respuesta_id bigint not null unique references autoevaluaciones_respuestas(id) on delete cascade,
  descripcion_actividad text not null,
  responsable text not null,
  fecha_compromiso date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'cumplido')),
  evidencia_pdf_url text,
  creado_en timestamptz not null default now()
);

create index on autoevaluaciones_compromisos (autoevaluacion_id);
create index on autoevaluaciones_compromisos (estado);

alter table autoevaluaciones_compromisos enable row level security;

create policy "compromisos lectura autenticados" on autoevaluaciones_compromisos
  for select using (auth.role() = 'authenticated');
create policy "compromisos escritura autenticados" on autoevaluaciones_compromisos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('compromisos-evidencias', 'compromisos-evidencias', false)
on conflict (id) do nothing;

create policy "evidencias lectura autenticados" on storage.objects
  for select using (bucket_id = 'compromisos-evidencias' and auth.role() = 'authenticated');
create policy "evidencias escritura autenticados" on storage.objects
  for insert with check (bucket_id = 'compromisos-evidencias' and auth.role() = 'authenticated');
