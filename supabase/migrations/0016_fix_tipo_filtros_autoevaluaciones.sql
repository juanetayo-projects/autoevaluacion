-- Fix: modalidad_filtro/complejidad_filtro se crearon como `text` (0005),
-- pero el frontend siempre los trata como arrays (SelectorMultiple guarda
-- string[], y NuevaAutoevaluacion los lee con .length/.map/.join). Al
-- insertar un array JS en una columna `text`, PostgREST lo serializa como el
-- string JSON "[\"Intramural\"]" en vez de guardarlo como array real; al
-- releer ese borrador/finalizada, el frontend recibe un string y
-- filtroIn()/Array.prototype.join truenan sobre él — la auto-evaluación se
-- queda colgada en el spinner de carga ("pantalla en blanco", reportado
-- 2026-09-03). Hay también filas antiguas (pre multi-selección) con un
-- string plano sin corchetes (ej. "Intramural"), de cuando el filtro era de
-- selección única.
--
-- `alter column ... type text[] using (...)` con subquery en la expresión
-- falla ("cannot use subquery in transform expression"), así que se
-- convierte por columna auxiliar + UPDATE en vez de un solo ALTER.
alter table autoevaluaciones add column modalidad_filtro_new text[];
alter table autoevaluaciones add column complejidad_filtro_new text[];

update autoevaluaciones set
  modalidad_filtro_new = case
    when modalidad_filtro is null then null
    when modalidad_filtro like '[%' then array(select jsonb_array_elements_text(modalidad_filtro::jsonb))
    else array[modalidad_filtro]
  end,
  complejidad_filtro_new = case
    when complejidad_filtro is null then null
    when complejidad_filtro like '[%' then array(select jsonb_array_elements_text(complejidad_filtro::jsonb))
    else array[complejidad_filtro]
  end;

alter table autoevaluaciones drop column modalidad_filtro;
alter table autoevaluaciones drop column complejidad_filtro;
alter table autoevaluaciones rename column modalidad_filtro_new to modalidad_filtro;
alter table autoevaluaciones rename column complejidad_filtro_new to complejidad_filtro;
