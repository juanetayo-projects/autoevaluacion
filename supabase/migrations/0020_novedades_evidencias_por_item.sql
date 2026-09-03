-- Evidencia documental por requisito individual (pedido 2026-09-03, tras
-- referencia visual del cliente): además de los adjuntos generales de la
-- habilitación (habilitaciones_novedades_adjuntos), cada fila del checklist
-- puede tener su propia evidencia (ej. el PDF de la evidencia de
-- notificación al ente territorial de ESE requisito puntual).
-- Reutiliza el bucket privado 'novedades-adjuntos' (0019), bajo la ruta
-- "<habilitacion_id>/items/<catalogo_id>/<archivo>".

create table novedades_respuestas_evidencias (
  id bigint generated always as identity primary key,
  habilitacion_id uuid not null references habilitaciones_novedades(id) on delete cascade,
  catalogo_id bigint not null references novedades_res3100_catalogo(id),
  nombre_archivo text not null,
  ruta text not null,
  tamano_bytes bigint,
  subido_por uuid references profiles(id),
  subido_en timestamptz not null default now()
);

create index on novedades_respuestas_evidencias (habilitacion_id, catalogo_id);

alter table novedades_respuestas_evidencias enable row level security;

create policy "novedades_respuestas_evidencias lectura autenticados" on novedades_respuestas_evidencias
  for select using (auth.role() = 'authenticated');
create policy "novedades_respuestas_evidencias escritura autenticados" on novedades_respuestas_evidencias
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
