-- Los 29 Servicios Habilitados reales de la clínica (docs/habilitacion1732.md
-- sección 4.2/4.3). Ya no vienen del Excel (la v3 quitó la matriz K:EH) —
-- se administran desde la app (CRUD Admin), sembrados aquí como punto de
-- partida a revisar/corregir por el cliente.

create table servicios_habilitados (
  id bigint generated always as identity primary key,
  sede_id bigint not null references sedes(id),
  nombre text not null,
  servicio_res1732_id bigint not null references servicios_res1732(id),
  activo boolean not null default true
);

alter table servicios_habilitados enable row level security;

create policy "servicios_habilitados lectura autenticados" on servicios_habilitados
  for select using (auth.role() = 'authenticated');
create policy "servicios_habilitados escritura admin" on servicios_habilitados
  for all using (is_admin()) with check (is_admin());

-- Torre — Apoyo Diagnóstico / Atención Inmediata / Internación (14)
insert into servicios_habilitados (sede_id, nombre, servicio_res1732_id)
select (select id from sedes where nombre = 'Torre'), v.nombre_real,
       (select id from servicios_res1732 where nombre = v.servicio_generico)
from (values
  ('Laboratorio clínico', 'Laboratorio clínico'),
  ('Toma muestras laboratorio', 'Toma de muestras de laboratorio'),
  ('Servicio Farmacéutico', 'Servicio farmacéutico'),
  ('Terapia Respiratoria (Todas las terapias)', 'Terapias'),
  ('Diagnóstico Vascular', 'Diagnóstico vascular'),
  ('Hemodinamia e intervencionismo', 'Hemodinamia e intervencionismo'),
  ('Imágenes Diagnósticas ionizantes', 'Imágenes diagnósticas'),
  ('Imágenes Diagnósticas NO Ionizantes', 'Imágenes diagnósticas'),
  ('Gestión Pre Transfusional', 'Gestión pre transfusional'),
  ('Transporte asistencial medicalizado', 'Transporte asistencial'),
  ('Hospitalización Adultos', 'Hospitalización'),
  ('Hospitalización parcial', 'Hospitalización parcial'),
  ('Cuidado Intensivo Adultos', 'Cuidado intensivo adultos'),
  ('Cuidado Intermedio Adultos', 'Cuidado intermedio adulto')
) as v(nombre_real, servicio_generico);

-- Torre — Quirúrgicos (14) — todos mapean al mismo genérico "Cirugía"
insert into servicios_habilitados (sede_id, nombre, servicio_res1732_id)
select (select id from sedes where nombre = 'Torre'), v.nombre_real,
       (select id from servicios_res1732 where nombre = 'Cirugía')
from (values
  ('Cirugía cardiovascular'), ('Neurocirugía'), ('Cirugía gastrointestinal'),
  ('Cirugía de tórax'), ('Cirugía dermatológica'), ('Cirugía de la mano'),
  ('Cirugía urológica'), ('Cirugía plástica y estética'), ('Cirugía otorrinolaringología'),
  ('Cirugía ortopédica'), ('Cirugía maxilofacial'), ('Cirugía ginecológica'),
  ('Cirugía general'), ('Cirugía vascular')
) as v(nombre_real);

-- Urgencias (1)
insert into servicios_habilitados (sede_id, nombre, servicio_res1732_id)
values (
  (select id from sedes where nombre = 'Urgencias'),
  'Sede Urgencias',
  (select id from servicios_res1732 where nombre = 'Urgencias')
);
