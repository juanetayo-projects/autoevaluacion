-- Catálogo de la Res.3100, Capítulo 10.5 "TRÁMITE DE NOVEDADES" (Tablas No. 3
-- a 6, páginas 49-59). Formato largo: una fila por requisito documental de la
-- columna "IPS" de cada tabla — mismo patrón que criterios_res3100
-- (0012_schema_res3100.sql), sembrado desde
-- docs/Autoevaluacion_Res3100_Novedades_v1.xlsx (hoja "AUTOEVALUACION
-- NOVEDADES"). Solo se transcribieron las 2 primeras columnas de cada tabla
-- (Novedad + IPS), tal como se acordó con el cliente; las condiciones/notas
-- marcadas con viñeta en el documento original quedan en la columna `nota`.

create table novedades_res3100_catalogo (
  id bigint generated always as identity primary key,
  tabla_no integer not null check (tabla_no between 3 and 6),
  tabla_descripcion text not null,
  novedad_orden integer not null,
  novedad text not null,
  item_no integer not null,
  requisito text not null,
  nota text,
  pagina integer,
  orden integer not null,
  activo boolean not null default true,
  unique (tabla_no, novedad_orden, item_no)
);

create index on novedades_res3100_catalogo (tabla_no);
create index on novedades_res3100_catalogo (novedad);

alter table novedades_res3100_catalogo enable row level security;

create policy "novedades_res3100_catalogo lectura autenticados" on novedades_res3100_catalogo
  for select using (auth.role() = 'authenticated');
create policy "novedades_res3100_catalogo escritura admin" on novedades_res3100_catalogo
  for all using (is_admin()) with check (is_admin());

insert into novedades_res3100_catalogo
  (tabla_no, tabla_descripcion, novedad_orden, novedad, item_no, requisito, nota, pagina, orden)
values
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 1, 'Cierre del Prestador de servicios de salud', 1, 'Formulario de novedad.', null, 49, 1),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 1, 'Cierre del Prestador de servicios de salud', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 49, 2),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 1, 'Cierre del Prestador de servicios de salud', 3, 'Carta del prestador dirigida al ente territorial donde se informa sobre la gestión adelantada con las Historias Clínicas y su entrega final.', null, 49, 3),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 1, 'Cierre del Prestador de servicios de salud', 4, 'Copia del documento de identidad del representante legal.', null, 49, 4),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 2, 'Disolución y liquidación de la entidad', 1, 'Formulario de Novedad.', null, 49, 5),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 2, 'Disolución y liquidación de la entidad', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 49, 6),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 2, 'Disolución y liquidación de la entidad', 3, 'Carta del prestador dirigida al ente territorial donde se informa sobre la gestión adelantada con las Historias Clínicas y su entrega final.', null, 49, 7),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 2, 'Disolución y liquidación de la entidad', 4, 'Copia del documento de identidad del representante legal.', null, 49, 8),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 1, 'Formulario de Novedad.', null, 49, 9),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 2, 'Documento de Existencia y Representación Legal actualizado, de acuerdo al tipo de entidad.', null, 49, 10),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 3, 'Carta del prestador dirigida al ente territorial donde se informa sobre la gestión adelantada con las Historias Clínicas y su entrega final.', null, 49, 11),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 4, 'Copia de la licencia de construcción.', 'Es exigible a edificaciones donde funcione el prestador, construidas, ampliadas o remodeladas con posterioridad al 2 de diciembre de 1996.', 49, 12),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 5, 'Certificado de seguridad de la edificación.', null, 49, 13),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 6, 'Copia del estudio de vulnerabilidad estructural.', 'Sólo será exigible a prestadores con servicios de urgencias, servicios de cirugía, o de unidad de cuidado intensivo neonatal, pediátrico, adulto, de acuerdo con lo establecido en la NSR 10 que funcionen en edificaciones construidas con anterioridad al 2010.', 49, 14),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 7, 'Copia del plan hospitalario para emergencias.', null, 49, 15),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 8, 'Copia del plan de mantenimiento de la planta física incluido equipamiento fijo.', null, 49, 16),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 3, 'Cambio de domicilio', 9, 'Certificado de conformidad de las instalaciones eléctricas.', 'Para prestadores que funcionen en edificaciones construidas con anterioridad a mayo del 2005, se solicitará una certificación expedida por un profesional competente en la cual certifique que las instalaciones eléctricas de la edificación donde se prestan los servicios de salud, no representan alto riesgo para la salud y la vida de las personas y animales, o atenten contra el medio ambiente. Adicionalmente el prestador deberá presentar un plan de ajustes de las instalaciones eléctricas.
Para prestadores que funcionen en edificaciones construidas con posterioridad a mayo del 2005, o edificaciones adaptadas como instituciones de salud, se solicitará una certificación expedida por un organismo de inspección acreditado por la ONAC.', 49, 17),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 4, 'Cambio de nomenclatura', 1, 'Formulario de Novedad.', null, 51, 18),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 4, 'Cambio de nomenclatura', 2, 'Declaración de la Autoevaluación.', null, 51, 19),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 4, 'Cambio de nomenclatura', 3, 'Documento de Existencia y Representación Legal actualizado, de acuerdo con el tipo de entidad.', null, 51, 20),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 5, 'Cambio de representante legal', 1, 'Formulario de Novedad.', null, 51, 21),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 5, 'Cambio de representante legal', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 51, 22),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 5, 'Cambio de representante legal', 3, 'Copia del documento de identidad del nuevo Representante Legal.', null, 51, 23),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 6, 'Cambio razón social o nombre que no implique cambio de NIT, ni de documento de identidad', 1, 'Formulario de Novedad.', null, 51, 24),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 6, 'Cambio razón social o nombre que no implique cambio de NIT, ni de documento de identidad', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 51, 25),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 6, 'Cambio razón social o nombre que no implique cambio de NIT, ni de documento de identidad', 3, 'Autorización previa emitida por la Superintendencia Nacional de Salud, en cumplimiento del Decreto 2462 de 2013 y la Circular 01 de 2018 de dicha Superintendencia o las normas que lo modifiquen o sustituyan, cuando aplique.', null, 51, 26),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 6, 'Cambio razón social o nombre que no implique cambio de NIT, ni de documento de identidad', 4, 'Copia del documento de identidad del representante legal.', null, 51, 27),
(3, 'Requisitos para presentar novedades del prestador de servicios de salud', 7, 'Cambio de datos de contacto (teléfono y correo electrónico) — Trámite en línea', 1, 'Formulario de Novedad.', null, 51, 28),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 1, 'Formulario de Novedad.', null, 51, 29),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 2, 'Documento de Existencia y Representación Legal vigente, de la sede principal y la nueva sede.', null, 51, 30),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 3, 'En dicho certificado se deberá especificar la ubicación de la o las sedes.', null, 51, 31),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 4, 'Declaración de la Autoevaluación.', null, 51, 32),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 5, 'Copia del documento de identidad del representante legal.', null, 51, 33),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 6, 'Copia de la licencia de construcción.', 'Es exigible a edificaciones donde funcione el prestador, construidas, ampliadas o remodeladas con posterioridad al 2 de diciembre de 1996.
Para prestadores ubicados en edificaciones de uso mixto construidas, ampliadas o remodeladas con posterioridad al 2 de diciembre de 1996, se solicitará el permiso otorgado por la propiedad horizontal para la adecuación en la edificación de servicios de salud, y la licencia de construcción de la edificación.', 51, 34),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 7, 'Certificado de seguridad de la edificación.', null, 51, 35),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 8, 'Copia del estudio de vulnerabilidad estructural.', 'Sólo será exigible a prestadores con servicios de urgencias, servicios de cirugía, o de unidad de cuidado intensivo neonatal, pediátrico, adulto, de acuerdo con lo establecido en la NSR 10 que funcionen en edificaciones construidas con anterioridad al 2010.', 51, 36),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 9, 'Copia del plan hospitalario para emergencias.', null, 51, 37),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 10, 'Copia del plan de mantenimiento de la planta física incluido equipamiento fijo.', null, 51, 38),
(4, 'Requisitos para presentar novedades de la sede', 1, 'Apertura de sede', 11, 'Certificado de conformidad de las instalaciones eléctricas.', 'Para prestadores que funcionen en edificaciones construidas con anterioridad a mayo del 2005, se solicitará una certificación expedida por un profesional competente en la cual certifique que las instalaciones eléctricas de la edificación donde se prestan los servicios de salud, no representan alto riesgo para la salud y la vida de las personas y animales, o atenten contra el medio ambiente. Adicionalmente el prestador deberá presentar un plan de ajustes de las instalaciones eléctricas.
Para prestadores que funcionen en edificaciones construidas con posterioridad a mayo del 2005, o edificaciones adaptadas como instituciones de salud, se solicitará una certificación expedida por un organismo de inspección acreditado por la ONAC.', 51, 39),
(4, 'Requisitos para presentar novedades de la sede', 2, 'Cierre de sede', 1, 'Formulario de Novedad.', null, 53, 40),
(4, 'Requisitos para presentar novedades de la sede', 2, 'Cierre de sede', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 53, 41),
(4, 'Requisitos para presentar novedades de la sede', 2, 'Cierre de sede', 3, 'Carta del prestador dirigida al ente territorial donde se informa sobre la gestión adelantada con las Historias Clínicas y su entrega final.', null, 53, 42),
(4, 'Requisitos para presentar novedades de la sede', 2, 'Cierre de sede', 4, 'Copia del documento de identidad del representante legal.', null, 53, 43),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 1, 'Formulario de Novedad.', null, 54, 44),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 2, 'Declaración de la Autoevaluación.', null, 54, 45),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 3, 'Documento de Existencia y Representación Legal actualizado, de acuerdo al tipo de entidad.', null, 54, 46),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 4, 'Copia de la licencia de construcción.', 'Es exigible a edificaciones donde funcione el prestador, construidas, ampliadas o remodeladas con posterioridad al 2 de diciembre de 1996.
Para prestadores ubicados en edificaciones de uso mixto construidas, ampliadas o remodeladas con posterioridad al 2 de diciembre de 1996, se solicitará el permiso otorgado por la propiedad horizontal para la adecuación en la edificación de servicios de salud, y la licencia de construcción de la edificación.', 54, 47),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 5, 'Certificado de seguridad de la edificación.', null, 54, 48),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 6, 'Copia del estudio de vulnerabilidad estructural, cuando se requiera.', 'Sólo será exigible a prestadores con servicios de urgencias, servicios de cirugía, o de unidad de cuidado intensivo neonatal, pediátrico, adulto, de acuerdo con lo establecido en la NSR 10 que funcionen en edificaciones construidas con anterioridad al 2010.', 54, 49),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 7, 'Copia del plan hospitalario para emergencias.', null, 54, 50),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 8, 'Copia del plan de mantenimiento de la planta física incluido equipamiento fijo.', null, 54, 51),
(4, 'Requisitos para presentar novedades de la sede', 3, 'Cambio de domicilio', 9, 'Certificado de conformidad de las instalaciones eléctricas.', 'Para prestadores que funcionen en edificaciones construidas con anterioridad a mayo del 2005, se solicitará una certificación expedida por un profesional competente en la cual certifique que las instalaciones eléctricas de la edificación donde se prestan los servicios de salud, no representan alto riesgo para la salud y la vida de las personas y animales, o atenten contra el medio ambiente. Adicionalmente el prestador deberá presentar un plan de ajustes de las instalaciones eléctricas.
Para prestadores que funcionen en edificaciones construidas con posterioridad a mayo del 2005, o edificaciones adaptadas como instituciones de salud, se solicitará una certificación expedida por un organismo de inspección acreditado por la ONAC.', 54, 52),
(4, 'Requisitos para presentar novedades de la sede', 4, 'Cambio de nomenclatura', 1, 'Formulario de Novedad.', null, 55, 53),
(4, 'Requisitos para presentar novedades de la sede', 4, 'Cambio de nomenclatura', 2, 'Declaración de la Autoevaluación.', null, 55, 54),
(4, 'Requisitos para presentar novedades de la sede', 4, 'Cambio de nomenclatura', 3, 'Documento de Existencia y Representación Legal actualizado, de acuerdo con el tipo de entidad.', null, 55, 55),
(4, 'Requisitos para presentar novedades de la sede', 5, 'Cambio de sede principal', 1, 'Formulario de Novedad.', null, 55, 56),
(4, 'Requisitos para presentar novedades de la sede', 5, 'Cambio de sede principal', 2, 'Declaración de la Autoevaluación.', null, 55, 57),
(4, 'Requisitos para presentar novedades de la sede', 5, 'Cambio de sede principal', 3, 'Documento de Existencia y Representación Legal actualizado, de acuerdo con el tipo de entidad.', null, 55, 58),
(4, 'Requisitos para presentar novedades de la sede', 6, 'Cambio de datos de contacto (teléfono y correo electrónico) — Trámite en línea', 1, 'Formulario de Novedad.', null, 56, 59),
(4, 'Requisitos para presentar novedades de la sede', 7, 'Cambio de director, gerente, administrador o responsable', 1, 'Formulario de Novedad.', null, 56, 60),
(4, 'Requisitos para presentar novedades de la sede', 7, 'Cambio de director, gerente, administrador o responsable', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 56, 61),
(4, 'Requisitos para presentar novedades de la sede', 7, 'Cambio de director, gerente, administrador o responsable', 3, 'Copia del documento de identidad del nuevo director, gerente, administrador o responsable.', null, 56, 62),
(4, 'Requisitos para presentar novedades de la sede', 8, 'Cambio de nombre de la sede, que no implique cambio de razón social', 1, 'Formulario de Novedad.', null, 56, 63),
(4, 'Requisitos para presentar novedades de la sede', 8, 'Cambio de nombre de la sede, que no implique cambio de razón social', 2, 'Documento de Existencia y Representación Legal vigente, de acuerdo al tipo de entidad.', null, 56, 64),
(4, 'Requisitos para presentar novedades de la sede', 8, 'Cambio de nombre de la sede, que no implique cambio de razón social', 3, 'Copia del documento de identidad del representante legal.', null, 56, 65),
(5, 'Requisitos para presentar novedades de los servicios', 1, 'Apertura de servicio', 1, 'Formulario de Novedad.', null, 56, 66),
(5, 'Requisitos para presentar novedades de los servicios', 1, 'Apertura de servicio', 2, 'Declaración de la Autoevaluación.', null, 56, 67),
(5, 'Requisitos para presentar novedades de los servicios', 1, 'Apertura de servicio', 3, 'Para los servicios de: otras consultas generales, de especialidades y otras cirugías se debe anexar copia del título o acto administrativo de homologación o convalidación del profesional de la salud.', null, 56, 68),
(5, 'Requisitos para presentar novedades de los servicios', 1, 'Apertura de servicio', 4, 'Carta de solicitud de visita previa para los servicios que lo requieran.', null, 56, 69),
(5, 'Requisitos para presentar novedades de los servicios', 2, 'Cierre temporal', 1, 'Formulario de Novedad.', null, 56, 70),
(5, 'Requisitos para presentar novedades de los servicios', 2, 'Cierre temporal', 2, 'Constancia de presentación de la carta dirigida a la secretaría departamental o distrital, o la entidad que tenga a cargo dichas competencias y a las entidades responsables de pago cuando la novedad de cierre sea para los servicios de urgencias, atención del parto, hospitalización pediátrica y cuidado intensivo.', 'Aplica trámite en línea, a excepción de IPS con cierre temporal de los servicios mencionados anteriormente.', 56, 71),
(5, 'Requisitos para presentar novedades de los servicios', 3, 'Reactivación del servicio — Trámite en línea', 1, 'Formulario de Novedad.', null, 57, 72),
(5, 'Requisitos para presentar novedades de los servicios', 3, 'Reactivación del servicio — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 57, 73),
(5, 'Requisitos para presentar novedades de los servicios', 4, 'Cierre definitivo de servicio', 1, 'Formulario de Novedad.', null, 57, 74),
(5, 'Requisitos para presentar novedades de los servicios', 4, 'Cierre definitivo de servicio', 2, 'Constancia de presentación de la carta dirigida a la secretaría departamental o distrital, o la entidad que tenga a cargo dichas competencias y a las entidades responsables de pago, cuando la novedad de cierre sea para los servicios de urgencias, atención del parto, hospitalización pediátrica y cuidado intensivo.', 'Aplica trámite en línea, a excepción de IPS con cierre temporal de los servicios mencionados anteriormente.', 57, 75),
(5, 'Requisitos para presentar novedades de los servicios', 5, 'Apertura de modalidad — Trámite en línea', 1, 'Formulario de Novedad.', null, 57, 76),
(5, 'Requisitos para presentar novedades de los servicios', 5, 'Apertura de modalidad — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 57, 77),
(5, 'Requisitos para presentar novedades de los servicios', 6, 'Cierre de modalidad — Trámite en línea', 1, 'Formulario de Novedad.', null, 57, 78),
(5, 'Requisitos para presentar novedades de los servicios', 7, 'Cambio de complejidad', 1, 'Formulario de Novedad.', null, 57, 79),
(5, 'Requisitos para presentar novedades de los servicios', 7, 'Cambio de complejidad', 2, 'Declaración de la autoevaluación.', null, 57, 80),
(5, 'Requisitos para presentar novedades de los servicios', 7, 'Cambio de complejidad', 3, 'Carta de solicitud de visita previa para el cambio de mediana a alta complejidad.', 'Aplica trámite en línea, para cambio de baja o mediana complejidad.', 57, 81),
(5, 'Requisitos para presentar novedades de los servicios', 8, 'Cambio de horario prestación de servicio — Trámite en línea', 1, 'Formulario de Novedad.', null, 57, 82),
(5, 'Requisitos para presentar novedades de los servicios', 9, 'Traslado de servicio — Trámite en línea', 1, 'Formulario de Novedad.', null, 57, 83),
(5, 'Requisitos para presentar novedades de los servicios', 9, 'Traslado de servicio — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 57, 84),
(5, 'Requisitos para presentar novedades de los servicios', 10, 'Cambio de prestador de referencia', 1, 'Formulario de Novedad.', null, 58, 85),
(5, 'Requisitos para presentar novedades de los servicios', 10, 'Cambio de prestador de referencia', 2, 'Copia del contrato o convenio con el prestador de referencia habilitado.', null, 58, 86),
(5, 'Requisitos para presentar novedades de los servicios', 10, 'Cambio de prestador de referencia', 3, 'Relación de servicios habilitados que el prestador de referencia garantiza al prestador remisor.', null, 58, 87),
(5, 'Requisitos para presentar novedades de los servicios', 10, 'Cambio de prestador de referencia', 4, 'Certificado de conexión a internet.', null, 58, 88),
(5, 'Requisitos para presentar novedades de los servicios', 10, 'Cambio de prestador de referencia', 5, 'Copia del documento de identidad del Representante Legal.', null, 58, 89),
(5, 'Requisitos para presentar novedades de los servicios', 11, 'Cambio en la especificidad del servicio', 1, 'Formulario de Novedad.', null, 58, 90),
(5, 'Requisitos para presentar novedades de los servicios', 11, 'Cambio en la especificidad del servicio', 2, 'Declaración de la autoevaluación.', null, 58, 91),
(5, 'Requisitos para presentar novedades de los servicios', 11, 'Cambio en la especificidad del servicio', 3, 'Para los servicios de: otras consultas generales, de especialidades y otras cirugías se debe anexar copia del título o acto administrativo de homologación o convalidación.', null, 58, 92),
(6, 'Requisitos para presentar novedades de capacidad instalada', 1, 'Apertura de camas — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 93),
(6, 'Requisitos para presentar novedades de capacidad instalada', 1, 'Apertura de camas — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 58, 94),
(6, 'Requisitos para presentar novedades de capacidad instalada', 2, 'Cierre de camas — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 95),
(6, 'Requisitos para presentar novedades de capacidad instalada', 3, 'Apertura de salas — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 96),
(6, 'Requisitos para presentar novedades de capacidad instalada', 3, 'Apertura de salas — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 58, 97),
(6, 'Requisitos para presentar novedades de capacidad instalada', 4, 'Cierre de salas — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 98),
(6, 'Requisitos para presentar novedades de capacidad instalada', 5, 'Apertura de camillas de observación — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 99),
(6, 'Requisitos para presentar novedades de capacidad instalada', 5, 'Apertura de camillas de observación — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 58, 100),
(6, 'Requisitos para presentar novedades de capacidad instalada', 6, 'Cierre de camillas de observación — Trámite en línea', 1, 'Formulario de Novedad.', null, 58, 101),
(6, 'Requisitos para presentar novedades de capacidad instalada', 7, 'Apertura de ambulancias — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 102),
(6, 'Requisitos para presentar novedades de capacidad instalada', 7, 'Apertura de ambulancias — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 59, 103),
(6, 'Requisitos para presentar novedades de capacidad instalada', 8, 'Cierre de ambulancias — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 104),
(6, 'Requisitos para presentar novedades de capacidad instalada', 9, 'Apertura de sillas — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 105),
(6, 'Requisitos para presentar novedades de capacidad instalada', 9, 'Apertura de sillas — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 59, 106),
(6, 'Requisitos para presentar novedades de capacidad instalada', 10, 'Cierre de sillas — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 107),
(6, 'Requisitos para presentar novedades de capacidad instalada', 11, 'Apertura de unidad móvil — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 108),
(6, 'Requisitos para presentar novedades de capacidad instalada', 11, 'Apertura de unidad móvil — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 59, 109),
(6, 'Requisitos para presentar novedades de capacidad instalada', 12, 'Cierre de unidad móvil — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 110),
(6, 'Requisitos para presentar novedades de capacidad instalada', 13, 'Apertura de consultorios — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 111),
(6, 'Requisitos para presentar novedades de capacidad instalada', 13, 'Apertura de consultorios — Trámite en línea', 2, 'Declaración de la autoevaluación.', null, 59, 112),
(6, 'Requisitos para presentar novedades de capacidad instalada', 14, 'Cierre de consultorios — Trámite en línea', 1, 'Formulario de Novedad.', null, 59, 113);
