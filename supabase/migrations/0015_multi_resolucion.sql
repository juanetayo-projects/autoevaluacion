-- Soporte multi-resolución en autoevaluaciones: hasta ahora las cabeceras y
-- respuestas apuntaban únicamente al catálogo Res.1732 (servicio_res1732_id,
-- criterio_id -> criterios_res1732). Se agrega la Res.3100 como catálogo
-- independiente (0012-0014) y aquí se generaliza el módulo de
-- auto-evaluación para soportar ambas resoluciones desde una misma cabecera,
-- distinguidas por la nueva columna `resolucion`.

alter table autoevaluaciones
  add column resolucion text not null default 'res1732'
    check (resolucion in ('res1732', 'res3100'));

alter table autoevaluaciones
  alter column servicio_res1732_id drop not null;

alter table autoevaluaciones
  add column servicio_res3100_id bigint references servicios_res3100(id);

alter table autoevaluaciones
  add constraint autoevaluaciones_servicio_resolucion_check check (
    (resolucion = 'res1732' and servicio_res1732_id is not null and servicio_res3100_id is null)
    or
    (resolucion = 'res3100' and servicio_res3100_id is not null and servicio_res1732_id is null)
  );

create index on autoevaluaciones (servicio_res3100_id);
create index on autoevaluaciones (resolucion);

alter table autoevaluaciones_respuestas
  alter column criterio_id drop not null;

alter table autoevaluaciones_respuestas
  add column criterio_res3100_id bigint references criterios_res3100(id);

alter table autoevaluaciones_respuestas
  add constraint autoevaluaciones_respuestas_criterio_check check (
    (criterio_id is not null and criterio_res3100_id is null)
    or
    (criterio_id is null and criterio_res3100_id is not null)
  );

-- Postgres trata cada NULL como distinto en una unique constraint normal, así
-- que esta convive sin conflicto con la existente (autoevaluacion_id, criterio_id)
-- para las filas Res.1732, que dejan criterio_res3100_id en NULL.
create unique index autoevaluaciones_respuestas_res3100_unq
  on autoevaluaciones_respuestas (autoevaluacion_id, criterio_res3100_id);

create index on autoevaluaciones_respuestas (criterio_res3100_id);
