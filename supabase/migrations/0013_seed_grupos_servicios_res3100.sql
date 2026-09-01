-- Seed: grupos_res3100 y servicios_res3100 (hoja 'Servicios' de
-- Autoevaluacion_Res3100_v1.xlsx) — mismo patrón que 0003_seed_grupos_servicios.sql.

insert into grupos_res3100 (numeral, nombre, descripcion) values
  ('11.1', 'Todo los servicios', 'Estándares y criterios aplicables de manera transversal a todos los servicios de salud (Talento Humano, Infraestructura, Dotación, Medicamentos/Dispositivos Médicos e Insumos, Procesos Prioritarios, Historia Clínica y Registros, Interdependencia). Todo prestador debe cumplir estos criterios además de los específicos de cada servicio que habilite.'),
  ('11.2', 'Consulta externa', 'Descripción:
Son los servicios en los que se ofrece orientación, diagnóstico, tratamiento o paliación. De acuerdo con el criterio médico y en el marco de su autonomía, la atención podrá tener carácter prioritario.
En los ambientes, áreas, o salas de procedimientos dependientes del servicio de consulta externa, no pueden permanecer pacientes que requieran observación o internación. Las áreas de observación son exclusivas de los servicios de urgencias.
El grupo incluye los siguientes servicios:
Consulta externa general
Consulta externa especializada
Vacunación
Seguridad y Salud en el trabajo'),
  ('11.3', 'Apoyo diagnóstico y complementación terapéutica', 'Este grupo incluye los servicios de:
Terapias
Farmacéutico
Radiología odontológica
Imágenes diagnósticas.
- Métodos diagnósticos con imágenes obtenidas mediante equipos generadores de radiaciones ionizantes.
- Métodos diagnósticos con imágenes obtenidas mediante equipos generadores de radiaciones no ionizantes
Medicina nuclear
Radioterapia
Quimioterapia
Diagnóstico vascular
Hemodinamia e intervencionismo
Gestión pre transfusional
Toma de muestras de laboratorio clínico
Laboratorio clínico
Toma de muestras de cuello uterino y ginecológicas
Laboratorio de citologías cervico-uterinas
Laboratorio de histotecnología
Patología
Diálisis'),
  ('11.4', 'Internación', 'Este grupo incluye los servicios de:
Servicio de hospitalización
Servicio de hospitalización paciente crónico
Servicio de cuidado básico neonatal
Servicio de cuidado intermedio neonatal
Servicio de cuidado intensivo neonatal
Servicio de cuidado intermedio pediátrico
Servicio de cuidado intensivo pediátrico
Servicio de cuidado intermedio adulto
Servicio de cuidado intensivo adultos
Servicio de hospitalización en salud mental o consumo de sustancias psicoactivas
Servicio de hospitalización parcial
Servicio para el cuidado básico del consumo de sustancias psicoactivas'),
  ('11.5', 'Quirúrgico', 'Grupo integrado por el servicio de Cirugía.'),
  ('11.6', 'Atención inmediata', 'Grupo integrado por los servicios de Urgencias, Transporte Asistencial, Atención Prehospitalaria y Atención del Parto.');

insert into servicios_res3100 (numeral, grupo_res3100_id, nombre, descripcion, estructura) values
  ('11.1', (select id from grupos_res3100 where numeral = '11.1'), 'Todo los servicios', 'Estándares y criterios aplicables de manera transversal a todos los servicios de salud (Talento Humano, Infraestructura, Dotación, Medicamentos/Dispositivos Médicos e Insumos, Procesos Prioritarios, Historia Clínica y Registros, Interdependencia). Todo prestador debe cumplir estos criterios además de los específicos de cada servicio que habilite.', null),
  ('11.2.1', (select id from grupos_res3100 where numeral = '11.2'), 'Consulta externa general', null, 'Complejidad: Baja
Modalidades de prestación:
Intramural
Extramural: Unidad móvil, Jornada de Salud y Domiciliaria
Telemedicina – Categorías:
Interactiva – prestador de referencia
No interactiva – prestador de referencia
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de la salud
Telemonitoreo sincrónico y asincrónico- prestador de referencia'),
  ('11.2.2', (select id from grupos_res3100 where numeral = '11.2'), 'Consulta externa especializada', 'Hacen parte de este servicio entre otras, las siguientes especialidades:
Medicina alternativa y complementaria:
- Homeopática.
- Osteopática.
- Neuralterapéutica.
- Tradicional China
- Naturopática.
- Ayurvédica
Terapias alternativas y complementarias:
- Bioenergética.
- Terapia con filtros.
- Terapias manuales', 'Complejidad: Mediana
Modalidades de prestación:
Intramural
Extramural: Unidad móvil, Jornada de Salud y Domiciliaria
Telemedicina – Categorías:
Interactiva – prestador de referencia
No interactiva – prestador de referencia
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de la salud
Telemonitoreo sincrónico y asincrónico- prestador de referencia'),
  ('11.2.3', (select id from grupos_res3100 where numeral = '11.2'), 'Vacunación', 'Servicio en el cual se intervienen a los usuarios mediante las acciones de vacunación, definidas por el Estado como parte de las prestaciones de salud pública para lograr la protección de la población, o solicitadas de forma particular por el médico tratante o por el usuario en su decisión de evitar enfermedades inmunoprevenibles.', 'Complejidad: Baja
Modalidades: Intramural
Extramural Unidad Móvil, Jornada de Salud y Domiciliaria'),
  ('11.2.4', (select id from grupos_res3100 where numeral = '11.2'), 'Seguridad y salud en el trabajo', 'Descripción:
Es el servicio de salud donde se interroga y examina a un paciente, con el fin de monitorear la exposición a factores de riesgo laborales y determinar la existencia de consecuencias en la salud de las personas por dicha exposición. Se realizan valoraciones complementarias como apoyo al diagnóstico y forman parte de las evaluaciones médicas ocupacionales.', 'Complejidad: Mediana
Modalidades de prestación: Intramural
Extramural Unidad móvil y Jornada de Salud
Telemedicina – Categorías:
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia Entre dos profesionales'),
  ('11.3.1', (select id from grupos_res3100 where numeral = '11.3'), 'Terapias', 'Descripción:
Son los servicios donde se realizan procedimientos de tratamiento y rehabilitación a fin de prevenir discapacidades y lograr la curación o paliación de las enfermedades o síntomas. Incluye:
Fisioterapia o terapia física, fonoaudiología o terapia del lenguaje, terapia ocupacional y terapia respiratoria.', 'Complejidad: No aplica
Modalidades: Intramural
Extramural Unidad móvil, Jornada de Salud, Domiciliaria y Telemedicina – Categorías
Interactiva – prestador de referencia
No interactiva – prestador de referencia
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia
Entre dos profesionales
Telemonitoreo sincrónico y asincrónico- prestador de referencia'),
  ('11.3.2', (select id from grupos_res3100 where numeral = '11.3'), 'Farmacéutico', 'Es el servicio de atención en salud que apoya las actividades, procedimientos e intervenciones de carácter técnico, científico y administrativo, relacionados con los medicamentos y los dispositivos médicos utilizados en la promoción de la salud y la prevención, diagnóstico, tratamiento y rehabilitación de la enfermedad y paliación, con el fin de contribuir en forma armónica e integral al mejoramiento de la calidad de vida individual y colectiva.
Los prestadores de servicios de salud no pueden habilitar este servicio como único servicio en su portafolio.', 'Complejidades: Baja, mediana y alta.
Complejidad baja
En el servicio farmacéutico de baja complejidad se incluyen como mínimo los siguientes procesos generales: selección, adquisición, transporte, recepción, almacenamiento, conservación, control de fechas de vencimiento, control de cadena de frío, distribución, dispensación, uso, devolución; participación en grupos interdisciplinarios; farmacovigilancia, información y educación al paciente y a la comunidad sobre uso adecuado y destrucción o desnaturalización de medicamentos y dispositivos médicos.
Complejidades mediana y alta
Adicional a los procesos generales que se realizan en la baja complejidad, se ejecutan todos o algunos de los siguientes procesos especiales:
- Atención farmacéutica.
- Preparaciones: magistrales, extemporáneas, estériles y no estériles.
- Nutriciones parenterales.
- Mezcla de medicamentos oncológicos.
- Adecuación y ajuste de concentraciones para cumplir con las dosis prescritas, o reempaque o reenvase.
- Participación en programas relacionados con medicamentos y dispositivos médicos.
- Realización o participación en estudios sobre uso adecuado, demanda insatisfecha, farmacoepidemiología, farmacoeconomía, uso de antibióticos, farmacia clínica y cualquier tema relacionado de interés para el paciente, el servicio farmacéutico, las autoridades y la comunidad.
- Monitorización de medicamentos.
- Control, dispensación y distribución de radiofármacos.
- Investigación clínica.
- Preparación de guías para la entrega o aceptación de donaciones de medicamentos y dispositivos médicos.
Modalidades de prestación: Intramural
Extramural domiciliaria.
Telemedicina – Categorías:
Interactiva – prestador de referencia
No interactiva – prestador de referencia
Telexperticia sincrónico y asincrónico – prestador remisor - prestador de referencia Entre dos profesionales'),
  ('11.3.3', (select id from grupos_res3100 where numeral = '11.3'), 'Radiología odontológica', 'Es el servicio dedicado al diagnóstico de las enfermedades odontológicas, mediante el uso de métodos diagnósticos con imágenes obtenidas a través de radiaciones ionizantes.', 'Complejidad: No aplica.
Modalidades de prestación: Intramural
Extramural: Unidad móvil
Telemedicina – Categorías:
Telexperticia sincrónico y asincrónico: prestador remisor - prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud'),
  ('11.3.4', (select id from grupos_res3100 where numeral = '11.3'), 'Imágenes diagnósticas', 'Es el servicio dedicado al apoyo diagnóstico o tratamiento de las enfermedades mediante el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones ionizantes o no ionizantes.', 'Complejidades:
- Baja, mediana y alta: Aplica para el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones ionizantes.
- Mediana: Aplica para el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones no ionizantes.
Modalidades de prestación:
Intramural: Aplica para el uso de radiaciones ionizantes y no ionizantes.
Extramural.
- Unidad móvil: Aplica para el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones ionizantes y no ionizantes, no aplica la realización de procedimientos con medio de contraste e intervencionismo.
- Domiciliaria y Jornada de Salud: Aplica para el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones no ionizantes.
Cuando se oferte por parte de un mismo prestador el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones ionizantes y no ionizantes, puede compartir el talento humano y los criterios que se especifiquen en el estándar de infraestructura.
Telemedicina – Categorías:
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia Entre dos profesionales
Aplica para el uso de métodos diagnósticos con imágenes obtenidas a través de equipos generadores de radiaciones ionizantes en baja, mediana y alta complejidad y no ionizantes en mediana complejidad.'),
  ('11.3.4.1', (select id from grupos_res3100 where numeral = '11.3'), 'Métodos diagnósticos con imágenes obtenidas mediante equipos generadores de radiaciones ionizantes', null, null),
  ('11.3.4.2', (select id from grupos_res3100 where numeral = '11.3'), 'Métodos diagnósticos con imágenes obtenidas mediante equipos generadores de radiaciones no ionizantes', null, null),
  ('11.3.5', (select id from grupos_res3100 where numeral = '11.3'), 'Medicina nuclear', 'Servicio en el que se realizan procedimientos diagnósticos o terapéuticos mediante fuentes no selladas de radiación constituidas por isótopos radiactivos, radiofármacos o radionúclidos de uso en humanos.', 'Complejidad: Alta
Modalidad de prestación: Intramural
Telemedicina – Categorías:
Telexperticia sincrónico - prestador remisor y prestador de referencia
Entre dos profesionales'),
  ('11.3.6', (select id from grupos_res3100 where numeral = '11.3'), 'Radioterapia', 'Servicio en el que se lleva a cabo tratamiento médico que hace uso de radiación ionizante con el fin de erradicar un volumen tumoral benigno o maligno y en patologías no tumorales.', 'Complejidad: Alta
Modalidades de prestación: Intramural
Telemedicina – Categorías:
Telexperticia sincrónico - prestador remisor y prestador de referencia
Entre dos profesionales'),
  ('11.3.7', (select id from grupos_res3100 where numeral = '11.3'), 'Quimioterapia', 'Servicio de administración de medicamentos oncológicos.', 'Complejidad: Alta
Modalidades de prestación:
- Intramural
- Extramural – Domiciliaria. Aplica para los prestadores que cuenten con el servicio en la modalidad intramural.
- Telemedicina – Categorías: Telexperticia sincrónico prestador remisor - prestador de referencia Entre dos profesionales'),
  ('11.3.8', (select id from grupos_res3100 where numeral = '11.3'), 'Diagnóstico vascular', 'Es el servicio que utiliza métodos y procedimientos para el diagnóstico de enfermedades o disfunciones del sistema cardiovascular y vascular periférico (venoso, arterial y linfático), de sus órganos o la demostración de sus procesos fisiológicos.', 'Complejidad: Mediana
Modalidades de prestación: Intramural Telemedicina – Categorías
Telexperticia sincrónico y asincrónico - prestador remisor - prestador de referencia
Entre dos profesionales'),
  ('11.3.9', (select id from grupos_res3100 where numeral = '11.3'), 'Hemodinamia e intervencionismo', 'Es el servicio en el cual se realizan procedimientos diagnósticos y terapéuticos del sistema vascular, cardiovascular y no vascular mediante técnicas invasivas bajo visión angiográfica.', 'Complejidad: Alta.
Modalidad de prestación: Intramural
Telemedicina – Categorías:
Telexperticia sincrónico - asincrónico prestador remisor – prestador de referencia
Entre dos profesionales'),
  ('11.3.10', (select id from grupos_res3100 where numeral = '11.3'), 'Gestión pre transfusional', 'Servicio en el que se realizan procedimientos previos a la transfusión sanguínea, que incluye: la consecución, abastecimiento, almacenamiento y distribución de los componentes sanguíneos y la realización de las pruebas pre transfusionales con el fin de asegurar la selección adecuada del componente sanguíneo a transfundir, y su entrega al servicio en donde será transfundido el paciente.
Los prestadores de servicios de salud habilitarán este servicio para brindar apoyo a otros servicios de salud. No podrá habilitarse como servicio único.', 'Complejidad: No aplica.
Modalidad de prestación: Intramural'),
  ('11.3.11', (select id from grupos_res3100 where numeral = '11.3'), 'Toma de muestras de laboratorio clínico', 'Servicio en el cual se realiza la toma y recepción de muestras de origen humano, que serán remitidas para su procesamiento.', 'Complejidad: No aplica
Modalidades de prestación: Intramural Extramural Unidad Móvil, Jornada de Salud y Domiciliaria'),
  ('11.3.12', (select id from grupos_res3100 where numeral = '11.3'), 'Laboratorio clínico', 'Servicio en el cual se realizan procedimientos de análisis de especímenes biológicos de origen humano.
En este servicio se podrá realizar toma de muestras de origen humano. En tal caso, no será necesario habilitar el servicio de toma de muestras de laboratorio clínico.
Cuando se realicen pruebas de inmunología para trasplantes debe garantizarse atención 24 horas para el procesamiento de las muestras.', 'Complejidad: No aplica
Modalidades de prestación: Intramural
Extramural Jornada de Salud, Unidad Móvil
Telemedicina – Categorías
Telexperticia sincrónico y asincrónico - prestador remisor y prestador de referencia Entre dos profesionales'),
  ('11.3.13', (select id from grupos_res3100 where numeral = '11.3'), 'Toma de muestras de cuello uterino y ginecológicas', 'Servicio destinado a la realización de toma de muestras de tejido del cuello del útero, pruebas ADN/VPH, técnicas de inspección visual y muestras ginecológicas.', 'Complejidad: No Aplica
Modalidades de prestación: Intramural
Extramural Jornada de Salud y Unidad Móvil'),
  ('11.3.14', (select id from grupos_res3100 where numeral = '11.3'), 'Laboratorio de citologías cervico-uterinas', 'Servicio en el cual se realiza el análisis de las muestras de citología cervico-uterinas.', 'Complejidad: No aplica
Modalidades de prestación: Intramural
Telemedicina – Categorías Telexperticia sincrónico y asincrónico prestador remisor y prestador de referencia
Entre dos profesionales'),
  ('11.3.15', (select id from grupos_res3100 where numeral = '11.3'), 'Laboratorio de histotecnología', 'Servicio donde se realizan los procedimientos técnicos para la preparación y montaje de tejidos y material citológico de origen humano.', 'Complejidad: No Aplica
Modalidad de prestación: Intramural'),
  ('11.3.16', (select id from grupos_res3100 where numeral = '11.3'), 'Patología', 'Servicio donde se realiza el estudio integral de fragmentos de tejido u órganos (biopsias) y material citológico de origen humano.', 'Complejidad: Mediana
Modalidad de prestación: Intramural
Telemedicina – Categorías
Telexperticia sincrónico – asincrónico prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.3.17', (select id from grupos_res3100 where numeral = '11.3'), 'Diálisis', 'Servicio donde se realizan las terapias de suplencia de la Insuficiencia Renal Crónica o Aguda, así como otras terapias extracorpóreas, dentro de las cuales se encuentran: Hemodiálisis y Diálisis peritoneal', 'Complejidad:
Hemodiálisis: Alta.
Diálisis peritoneal: mediana.
Modalidades de prestación:
Hemodiálisis: Intramural.
Extramural Jornada de salud: Aplica únicamente para realizarse en                                  los servicios de cuidado intensivo y hospitalización.
Telemedicina – Categorías Telexperticia sincrónico prestador remisor                           y prestador de referencia
Entre dos profesionales
Diálisis peritoneal: Intramural.
Telemedicina – Categorías
Telexperticia sincrónico prestador remisor y prestador de referencia Entre dos profesionales'),
  ('11.4.1', (select id from grupos_res3100 where numeral = '11.4'), 'Hospitalización', 'Es el servicio que presta atención en salud a pacientes que por su condición de salud requieren estancia hospitalaria mayor a 24 horas para monitorización o realización de procedimientos.
Cuando se realice trasplante de células progenitoras hematopoyéticas los autorizados son los que proceden de:
- Médula Ósea.
- Sangre periférica.
- Sangre de cordón umbilical', 'Complejidad: Baja, mediana y alta
Modalidades de prestación: Intramural
Extramural Domiciliaria (aplica únicamente para baja complejidad) Telemedicina – Categorías:
Telexperticia sincrónico y asincrónico prestador remisor y prestador referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud en modalidad domiciliaria
Telemonitoreo sincrónico y asincrónico- prestador remisor y prestador referencia en modalidad domiciliaria
El servicio de hospitalización en la modalidad extramural domiciliaria será prestado con criterios controlados, con el apoyo de profesionales, técnicos o auxiliares de salud y la participación de la familia o un cuidador.'),
  ('11.4.2', (select id from grupos_res3100 where numeral = '11.4'), 'Hospitalización paciente crónico', 'Es el servicio que presta atención en salud al paciente con patología crónica con y sin ventilación, requiere valoraciones y cuidados por personal de salud, a través de un plan individualizado de atención, buscando mantener al paciente en su entorno, mantener funciones, prevenir el deterioro, con la máxima comodidad y alivio de síntomas posibles, garantizando su seguridad, cuando su condición clínica lo amerite.
El servicio de hospitalización paciente crónico será prestado con criterios controlados, con el apoyo de profesionales, técnicos o auxiliares de salud y la participación de la familia o un cuidador.', 'Complejidad: Baja y mediana.
Modalidades de prestación: Intramural
Extramural Domiciliaria
Telemedicina – Categorías:
Telexperticia sincrónico y asincrónico prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud en modalidad domiciliaria
Telemonitoreo sincrónico y asincrónico- prestador remisor y prestador referencia en modalidad domiciliaria'),
  ('11.4.3', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado básico neonatal', 'Es el servicio de atención del recién nacido hemodinámicamente estable, donde se realizan actividades para la atención integral de salud del paciente neonato (0- 30 días de vida o 44 semanas de edad corregida).', 'Complejidad: Baja
Modalidad de prestación: Intramural
Telemedicina - categorías:
Telexperticia sincrónica o asincrónica - prestador remisor y prestador de referencia
Entre dos profesionales'),
  ('11.4.4', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intermedio neonatal', 'Es el servicio donde se realizan actividades para la atención integral de la salud del neonato (0-30 días de vida o 44 semanas de edad corregida), que previsiblemente tienen un bajo riesgo de necesitar medidas terapéuticas de soporte vital, pero que cumplen con criterios médicos de ingreso al servicio.', 'Complejidad: Mediana
Modalidad de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.5', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intensivo neonatal', 'Servicio para la atención de pacientes recién nacidos críticamente enfermos, hasta los 30 días de vida o 44 semanas de edad corregida.', 'Complejidad: Alta
Modalidad de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.6', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intermedio pediátrico', 'Es el servicio para la atención de pacientes pediátricos con edades desde 1 mes o 44 semanas de edad corregida hasta los 18 años cumplidos de vida, o hasta la edad que por criterio médico pueden ser manejados en este servicio, que previsiblemente tienen un bajo riesgo de necesitar medidas terapéuticas de soporte vital.', 'Complejidad: Mediana
Modalidad de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.7', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intensivo pediátrico', 'Servicio para la atención de pacientes pediátricos con edades desde 1 mes o 44 semanas de edad corregida hasta los 18 años cumplidos de vida o hasta la edad que por criterio médico pueden ser manejados en este servicio, cuya condición clínica pone en peligro la vida del paciente críticamente enfermo con patologías que requieren soporte, monitorización y tratamiento especializado.
Cuando se oferte atención de paciente pediátrico quemado en condiciones críticas en un ambiente exclusivo fuera del servicio de cuidado intensivo pediátrico, cumplirá con los criterios establecidos en el presente servicio para el paciente pediátrico quemado.', 'Complejidad: Alta
Modalidad de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.8', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intermedio adulto', 'Es el servicio para la atención de pacientes adultos o desde la edad que por criterio médico pueden ser manejados en este servicio, que previsiblemente tienen un bajo riesgo de necesitar medidas terapéuticas de soporte vital, pero cuya condición de enfermedad requiere la utilización de técnicas de monitoreo no invasivo, vigilancia y manejo especial, incluyendo cuidados de enfermería adicionales a los que recibiría en servicios de hospitalización.', 'Complejidad: Mediana
Modalidad de prestación: Intramural
Telemedicina – categorías: Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.9', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado intensivo adultos', 'Servicio para la atención de pacientes adultos críticamente enfermos o desde la edad que por criterio médico puedan ser manejados en este servicio, con patologías que requieran soporte vital, monitorización y manejo especializado, cuya condición clínica pone en peligro la vida en forma inminente.
Cuando se oferte atención de paciente adulto quemado en condiciones críticas en un ambiente exclusivo fuera del servicio de cuidado intensivo adulto, cumplirá con los criterios establecidos en el presente servicio para el paciente adulto quemado.', 'Complejidad: Alta
Modalidad de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.10', (select id from grupos_res3100 where numeral = '11.4'), 'Hospitalización en salud mental o consumo de sustancias psicoactivas', 'Es el servicio que presta atención hospitalaria a pacientes con alteraciones en salud mental o por consumo de sustancias psicoactivas, con una estancia mayor a 24 horas.', 'Complejidad: Mediana y alta
Modalidades de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica o asincrónica - prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.11', (select id from grupos_res3100 where numeral = '11.4'), 'Hospitalización parcial', 'Es el servicio que presta atención a pacientes en internación parcial, diurna, nocturna, fin de semana y otras que no impliquen estancia completa.', 'Complejidad: Mediana
Modalidades de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica o asincrónica - prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.4.12', (select id from grupos_res3100 where numeral = '11.4'), 'Cuidado básico del consumo de sustancias psicoactivas', 'Es el servicio de internación en infraestructura no hospitalaria, para la atención de personas con consumo de sustancias psicoactivas, que incluye pernoctada.', 'Complejidad: Mediana
Modalidades de prestación: Intramural
Telemedicina – categorías:
Telexperticia sincrónica o asincrónica - prestador remisor y prestador referencia
Entre dos profesionales'),
  ('11.5.1', (select id from grupos_res3100 where numeral = '11.5'), 'Cirugía', 'Servicio destinado a la realización de procedimientos e intervenciones quirúrgicas, que requieren total asepsia. Los procedimientos e intervenciones pueden requerir o no internación para el manejo post operatorio.
Cuando se realicen procedimientos de trasplante de órganos y tejidos, los autorizados son:
Órganos:
Riñón, hígado, corazón, páncreas, pulmón, intestino, multivisceral y los demás que el Ministerio de Salud y Protección Social autorice.
Tejidos:
Tejidos oculares, osteomuscular, cardiovascular, piel y componentes de la piel y los demás que el Ministerio de Salud y Protección Social autorice.', 'Complejidades: Mediana y alta
Modalidades de prestación: Intramural
Extramural Jornada de Salud y Unidad Móvil - No aplica para trasplantes.
Telemedicina – categoría:
Telexperticia sincrónica o asincrónica
Entre dos profesionales'),
  ('11.6.1', (select id from grupos_res3100 where numeral = '11.6'), 'Urgencias', 'Servicio responsable de dar atención a las alteraciones de la integridad física, funcional y/o psíquica por cualquier causa con diversos grados de severidad, que comprometen la vida o funcionalidad de la persona y que requiere de la prestación inmediata de servicios de salud, a fin de conservar la vida y prevenir consecuencias críticas presentes o futuras. El servicio debe ser prestado las 24 horas del día.', 'Complejidades: Baja, mediana y alta.
Modalidad de prestación: Intramural
Telemedicina – categoría:
Telexperticia sincrónica o asincrónica
Entre dos profesionales'),
  ('11.6.2', (select id from grupos_res3100 where numeral = '11.6'), 'Transporte asistencial', 'Es el servicio de salud donde se realiza el traslado y se brinda atención oportuna y permanente al paciente en ambulancias terrestres, marítimas, fluviales y aéreas.', 'Complejidad Baja: Transporte terrestre, marítimo y fluvial
Complejidad Mediana: Transporte terrestre, marítimo, fluvial y aéreo
Modalidades de prestación: Extramural
Telemedicina – categoría:
Telexperticia sincrónico - prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud'),
  ('11.6.3', (select id from grupos_res3100 where numeral = '11.6'), 'Atención prehospitalaria', 'Es el servicio de salud responsable de las actividades, procedimientos, intervenciones terapéuticas prehospitalarias, encaminadas a prestar atención de urgencias a aquellas personas que han sufrido una alteración aguda de su integridad física o mental, causada por trauma o enfermedad de cualquier etiología, tendiente a preservar la vida y a disminuir las complicaciones y los riesgos de invalidez y muerte, en el sitio de ocurrencia del evento y hasta su traslado hacia un prestador de servicios de salud que garantice su atención. Puede incluir acciones de apoyo al salvamento y rescate.', 'Complejidad: Baja
Modalidades de prestación: Extramural
Telemedicina – categoría:
Telexperticia sincrónico - prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud'),
  ('11.6.4', (select id from grupos_res3100 where numeral = '11.6'), 'Atención del parto', 'Es el servicio destinado a la atención del preparto, parto y recuperación del binomio madre-hijo.', 'Complejidades: Baja, mediana y alta.
Modalidades de prestación: Intramural
Telemedicina – categoría:
Telexperticia sincrónico y asincrónico prestador remisor y prestador de referencia
Entre dos profesionales
Entre personal no profesional de salud y profesional de salud');
