-- Inactivar servicio (pedido 2026-09-03, punto 1): columna `activo` en las
-- 3 tablas de servicios (una por resolución/norma) para poder ocultar un
-- servicio del selector de "Nueva auto-evaluación" y de los filtros de
-- Catálogos sin borrarlo (las auto-evaluaciones ya creadas siguen
-- referenciándolo por FK). Se implementa igual en las 3 tablas porque
-- Catalogos.tsx reusa el mismo componente (ServiciosCatalogoTab) para las
-- 3 pestañas de servicios/capítulos.
alter table servicios_res1732 add column activo boolean not null default true;
alter table servicios_res3100 add column activo boolean not null default true;
alter table servicios_iso9001 add column activo boolean not null default true;
