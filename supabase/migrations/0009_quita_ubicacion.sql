-- Retira el campo/catálogo de Ubicación (pedido 2026-08-28, punto 1): el
-- cliente decidió reemplazarlo conceptualmente por "Periodicidad" (siguiente
-- migración). Solo 2 auto-evaluaciones de prueba tenían ubicacion_id
-- asignado — sin impacto en datos reales.
alter table autoevaluaciones drop column ubicacion_id;
drop table ubicaciones;
