-- Ubicación (catálogo creado en 0007) pasa a ser un campo de la cabecera de
-- la auto-evaluación, seleccionable por desplegable (pedido 2026-08-28).
-- Nullable a nivel de BD porque ya existen filas creadas antes de este
-- campo; el frontend la exige como obligatoria igual que Sede/Servicio.
alter table autoevaluaciones add column ubicacion_id bigint references ubicaciones(id);

create index on autoevaluaciones (ubicacion_id);
