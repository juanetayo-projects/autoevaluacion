-- Datos de prueba (punto 7 del pedido 2026-08-28): varias auto-evaluaciones
-- con combinaciones distintas de Sede/Servicio/Periodicidad/Estado, con
-- respuestas realistas para poder probar gráficos, filtros y Habilitar.
-- Usuario: Juan Carlos Etayo (admin, único perfil existente).
-- NO reproducir en un ambiente que ya tenga datos reales de producción sin
-- revisar antes — usa nombres de servicio distintivos y fechas de agosto
-- 2026 para poder identificarlos y borrarlos fácilmente si hace falta.

do $$
declare
  uid uuid := 'b96d0d1f-1bd8-4f01-9ed5-d3cbe22029d2';
  universal_id bigint;
  nueva_id uuid;
begin
  select id into universal_id from servicios_res1732 where numeral = '5';

  -- 1) Torre / Cirugía / Anual / finalizada + habilitada
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada, fecha_final, personas_evaluadas, comentarios_habilitacion, requiere_plan_accion, plan_accion_titulo, plan_accion_descripcion)
  values (1, 1, 1, 35, uid, '2026-08-10', 'finalizada', true, '2026-08-14', 22, 'Auto-evaluación anual de Cirugía, sin novedades mayores.', false, null, null)
  returning id into nueva_id;
  insert into autoevaluaciones_respuestas (autoevaluacion_id, criterio_id, respuesta, observacion)
  select nueva_id, cr.id, (array['cumple','cumple','cumple','cumple','no_cumple','no_cumple','no_aplica'])[1 + floor(random()*7)::int], ''
  from criterios_res1732 cr where cr.servicio_res1732_id = 35 or cr.servicio_res1732_id = universal_id;

  -- 2) Urgencias / Urgencias (servicio) / Extraordinario / finalizada + habilitada + plan de acción
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada, fecha_final, personas_evaluadas, comentarios_habilitacion, requiere_plan_accion, plan_accion_titulo, plan_accion_descripcion)
  values (1, 2, 3, 36, uid, '2026-08-12', 'finalizada', true, '2026-08-16', 15, 'Visita extraordinaria por PQRS de un usuario.', true, 'Ajuste de señalización y triage', 'Reforzar señalización de triage y capacitar personal de admisión en tiempos de respuesta.')
  returning id into nueva_id;
  insert into autoevaluaciones_respuestas (autoevaluacion_id, criterio_id, respuesta, observacion)
  select nueva_id, cr.id, (array['cumple','cumple','cumple','no_cumple','no_cumple','no_aplica'])[1 + floor(random()*6)::int], ''
  from criterios_res1732 cr where cr.servicio_res1732_id = 36 or cr.servicio_res1732_id = universal_id;

  -- 3) Centro de Especialistas / Consulta externa especializada / Nuevo Servicio / finalizada + habilitada
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada, fecha_final, personas_evaluadas, comentarios_habilitacion, requiere_plan_accion, plan_accion_titulo, plan_accion_descripcion)
  values (1, 3, 2, 3, uid, '2026-08-15', 'finalizada', true, '2026-08-19', 9, 'Apertura de nueva especialidad — evaluación previa a habilitación.', false, null, null)
  returning id into nueva_id;
  insert into autoevaluaciones_respuestas (autoevaluacion_id, criterio_id, respuesta, observacion)
  select nueva_id, cr.id, (array['cumple','cumple','cumple','cumple','cumple','no_cumple','no_aplica'])[1 + floor(random()*7)::int], ''
  from criterios_res1732 cr where cr.servicio_res1732_id = 3 or cr.servicio_res1732_id = universal_id;

  -- 4) Torre / Hospitalización / Anual / finalizada, SIN habilitar (para ver el contraste en el chart)
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada)
  values (1, 1, 1, 23, uid, '2026-08-18', 'finalizada', false)
  returning id into nueva_id;
  insert into autoevaluaciones_respuestas (autoevaluacion_id, criterio_id, respuesta, observacion)
  select nueva_id, cr.id, (array['cumple','cumple','no_cumple','no_cumple','no_aplica'])[1 + floor(random()*5)::int], ''
  from criterios_res1732 cr where cr.servicio_res1732_id = 23 or cr.servicio_res1732_id = universal_id;

  -- 5) Urgencias / Laboratorio clínico / Extraordinario / BORRADOR con avance parcial (~40%)
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada)
  values (1, 2, 3, 17, uid, '2026-08-20', 'borrador', false)
  returning id into nueva_id;
  insert into autoevaluaciones_respuestas (autoevaluacion_id, criterio_id, respuesta, observacion)
  select nueva_id, cr.id, (array['cumple','cumple','no_cumple','no_aplica'])[1 + floor(random()*4)::int], ''
  from criterios_res1732 cr
  where (cr.servicio_res1732_id = 17 or cr.servicio_res1732_id = universal_id) and random() < 0.4;

  -- 6) Centro de Especialistas / Imágenes diagnósticas / Anual / BORRADOR sin respuestas
  insert into autoevaluaciones (empresa_id, sede_id, periodicidad_id, servicio_res1732_id, usuario_id, fecha, estado, habilitada)
  values (1, 3, 1, 9, uid, '2026-08-22', 'borrador', false);
end $$;
