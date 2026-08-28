-- Datos capturados al Habilitar una auto-evaluación (pedido 2026-08-28,
-- punto 5): fecha final, personas evaluadas, comentarios, y un Plan de
-- Acción general opcional (distinto del compromiso por criterio "No
-- Cumple" que ya existe en autoevaluaciones_compromisos).
alter table autoevaluaciones
  add column fecha_final date,
  add column personas_evaluadas integer,
  add column comentarios_habilitacion text,
  add column requiere_plan_accion boolean not null default false,
  add column plan_accion_titulo text,
  add column plan_accion_descripcion text;
