-- Infomate: juicio y edición del día (paso 8). Se puede volver a correr.

-- Guarda lo que devolvió el juez. items: [{id, categoria, titulo_es, resumen, puntaje, motivo}]. Devuelve cuántas guardó.
CREATE OR REPLACE FUNCTION infomate_juzgar(items jsonb) RETURNS int
LANGUAGE sql AS $$
  WITH u AS (
    UPDATE noticias n SET titulo = i->>'titulo_es', resumen = i->>'resumen', puntaje = (i->>'puntaje')::smallint,
                          motivo = i->>'motivo', juzgada = now()
      FROM jsonb_array_elements(coalesce(items, '[]')) i
     WHERE n.id = (i->>'id')::uuid AND n.categoria = (i->>'categoria')::categoria
    RETURNING 1)
  SELECT count(*)::int FROM u
$$;

-- Arma la edición de un día: borra la que haya y carga las 5 de mayor puntaje de cada categoría entre las candidatas
-- de esta corrida (las que tienen `preseleccion`; se borra en cada corrida). Desempata puntaje_previo.
-- Si una categoría tiene menos de 5 juzgadas, carga las que haya. Devuelve cuántas quedaron por categoría.
CREATE OR REPLACE FUNCTION infomate_armar_edicion(dia date) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  DELETE FROM diaria WHERE fecha = dia;
  INSERT INTO diaria (fecha, categoria, orden, noticia_id)
  SELECT dia, categoria, rn, id FROM (
    SELECT id, categoria,
           row_number() OVER (PARTITION BY categoria ORDER BY puntaje DESC, puntaje_previo DESC NULLS LAST, preseleccion) AS rn
      FROM noticias
     WHERE candidata AND preseleccion IS NOT NULL AND puntaje IS NOT NULL) t
  WHERE rn <= 5;
  SELECT jsonb_object_agg(c, (SELECT count(*) FROM diaria d WHERE d.fecha = dia AND d.categoria = c))
    INTO res FROM unnest(enum_range(NULL::categoria)) c;
  RETURN res;
END $$;
