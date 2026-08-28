-- Catálogo de Ubicación (áreas/servicios físicos de la clínica) — tabla
-- independiente, igual patrón que empresas/sedes (sección 1 del pedido
-- 2026-08-28). No lleva FK a sede: es un catálogo plano reutilizable desde
-- cualquier sede.

create table ubicaciones (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

alter table ubicaciones enable row level security;

create policy "ubicaciones lectura autenticados" on ubicaciones
  for select using (auth.role() = 'authenticated');
create policy "ubicaciones escritura admin" on ubicaciones
  for all using (is_admin()) with check (is_admin());

insert into ubicaciones (nombre) values
  ('Piso-1'),
  ('Piso-2'),
  ('Piso-5'),
  ('Piso-6'),
  ('Piso-7'),
  ('Piso-8'),
  ('Piso-9'),
  ('Laboratorio'),
  ('Laboratorio clínico'),
  ('Toma muestras laboratorio'),
  ('Servicio Farmacéutico'),
  ('Terapia Respiratoria (Todas las terapias)'),
  ('Diagnóstico Vascular'),
  ('Hemodinamia e intervencionismo'),
  ('Imágenes Diagnósticas ionizantes'),
  ('Imágenes Diagnósticas'),
  ('Gestión Pre Transfuncional'),
  ('Transporte asistencial medicalizado'),
  ('Hospitalización Adultos'),
  ('Hospitalización Parcial'),
  ('Cuidado Intensivo Adultos'),
  ('Cuidado Intermedio Adultos');

-- Habilitación: gate adicional a "borrador"/"finalizada" (sección 2 del
-- pedido). Solo puede marcarse en una auto-evaluación "finalizada" — ese
-- estado ya garantiza que no quedó ningún criterio pendiente (alIntentarFinalizar
-- en NuevaAutoevaluacion.tsx bloquea "Finalizar" si avance.pendientes > 0), así
-- que exigir estado='finalizada' como precondición cubre la regla "no puede
-- haber ninguna pregunta pendiente" sin duplicar en SQL la lógica de qué
-- criterios aplican (universales + filtros de Modalidad/Complejidad).
alter table autoevaluaciones add column habilitada boolean not null default false;
alter table autoevaluaciones add constraint autoevaluaciones_habilitada_requiere_finalizada
  check (habilitada = false or estado = 'finalizada');

create index on autoevaluaciones (habilitada);
