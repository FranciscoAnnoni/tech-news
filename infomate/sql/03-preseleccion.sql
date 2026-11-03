-- Infomate: preselección, links reales y texto de las candidatas (paso 6). Se puede volver a correr.

-- Elige las preseleccionadas de cada categoría (15; 20 en tech, que tiene más páginas sin texto) entre lo que apareció en esta corrida y les pone `preseleccion` (1 a 15).
-- Reglas: primero las prioritarias (n.º 1 de HN, Google News Mundo y Google News Argentina), que no cuentan para los topes;
-- después por puntaje previo, con 4 por feed como máximo, 3 de deportes en ARG como máximo, sin lo publicado en `diaria`
-- en los 7 días anteriores (la edición de hoy no cuenta), sin dos que se parezcan 35 % o más y sin las publicadas por primera vez hace más de 36 h
-- (una noticia vieja que vuelve a aparecer en los feeds se une a su fila y conserva la fecha original).
CREATE OR REPLACE FUNCTION infomate_preseleccionar(p_corrida text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  POR_FEED constant int  := 4;
  -- Medios que no se pueden leer (bloquean bots, muro de pago, o bloquean al cliente HTTP de n8n): se guardan, pero no se preseleccionan.
  ILEGIBLES constant text[] := ARRAY['Reuters', 'CNN en Español', 'CNN', 'The Telegraph', 'Ars Technica', 'Bloomberg', 'Bloomberg.com',
                                     'The Wall Street Journal', 'WSJ', 'The New York Times', 'Financial Times', 'The Washington Post', 'The Economist'];
  cuantas int;
  DEPORTES constant int  := 3;
  PARECIDO constant real := 0.35;
  ANTIGUEDAD constant interval := '36 hours';
  -- La edición de hoy no cuenta: si se vuelve a correr el mismo día, sus noticias compiten de nuevo.
  hoy constant date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  r record; v_cat categoria; elegidas uuid[]; titulos text[]; feeds text[]; n_dep int; res jsonb := '{}';
BEGIN
  UPDATE noticias SET preseleccion = NULL WHERE preseleccion IS NOT NULL;
  FOREACH v_cat IN ARRAY enum_range(NULL::categoria) LOOP
    elegidas := '{}'; titulos := '{}'; feeds := '{}'; n_dep := 0;
    cuantas := CASE WHEN v_cat = 'tech' THEN 20 ELSE 15 END;
    FOR r IN SELECT n.id, n.feed, n.fuente, n.prioridad, f_norm(n.titulo_original) AS t FROM noticias n
             WHERE n.categoria = v_cat AND n.ultima_corrida = p_corrida
               AND (n.fecha_publicacion IS NULL OR n.fecha_publicacion >= now() - ANTIGUEDAD)
             ORDER BY n.prioridad DESC, n.puntaje_previo DESC NULLS LAST, n.posicion LOOP
      EXIT WHEN cardinality(elegidas) >= cuantas;
      CONTINUE WHEN EXISTS (SELECT 1 FROM diaria d JOIN noticias p ON p.id = d.noticia_id AND p.categoria = d.categoria
                            WHERE d.fecha > hoy - 7 AND d.fecha < hoy AND (p.id = r.id OR similarity(f_norm(p.titulo_original), r.t) >= PARECIDO));
      CONTINUE WHEN EXISTS (SELECT 1 FROM unnest(titulos) x WHERE similarity(x, r.t) >= PARECIDO);
      IF NOT r.prioridad THEN
        CONTINUE WHEN r.fuente = ANY(ILEGIBLES);
        CONTINUE WHEN (SELECT count(*) FROM unnest(feeds) f WHERE f = r.feed) >= POR_FEED;
        CONTINUE WHEN v_cat = 'arg' AND r.feed ILIKE '%deportes%' AND n_dep >= DEPORTES;
      END IF;
      elegidas := elegidas || r.id; titulos := titulos || r.t;
      IF NOT r.prioridad THEN
        feeds := feeds || coalesce(r.feed, '');
        IF r.feed ILIKE '%deportes%' THEN n_dep := n_dep + 1; END IF;
      END IF;
    END LOOP;
    UPDATE noticias n SET preseleccion = x.orden
      FROM unnest(elegidas) WITH ORDINALITY AS x(id, orden)
     WHERE n.id = x.id AND n.categoria = v_cat;
    res := res || jsonb_build_object(v_cat::text, cardinality(elegidas));
  END LOOP;
  RETURN res;
END $$;

-- Guarda el link real de las candidatas que venían de Google News. items: [{id, categoria, link}]
-- Si otra noticia de la misma categoría ya tiene ese link, no lo cambia (quedaría repetido).
CREATE OR REPLACE FUNCTION infomate_guardar_links(items jsonb) RETURNS int
LANGUAGE sql AS $$
  WITH u AS (
    UPDATE noticias n SET link = i->>'link'
      FROM jsonb_array_elements(coalesce(items, '[]')) i
     WHERE n.id = (i->>'id')::uuid AND n.categoria = (i->>'categoria')::categoria
       AND i->>'link' ~ '^https?://' AND i->>'link' !~ 'news\.google\.com'
       AND NOT EXISTS (SELECT 1 FROM noticias o WHERE o.categoria = n.categoria AND o.link = i->>'link')
    RETURNING 1)
  SELECT count(*)::int FROM u
$$;

-- Guarda el texto bajado y marca `candidata` en las 10 primeras preseleccionadas con texto de cada categoría.
-- Las prioritarias quedan candidatas aunque no tengan texto (por ejemplo, un "Show HN" que es un sitio y no una nota).
-- items: [{id, categoria, contenido}]. Devuelve por categoría: preseleccionadas, con texto y candidatas.
CREATE OR REPLACE FUNCTION infomate_guardar_texto(items jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE CANDIDATAS constant int := 10; res jsonb;
BEGIN
  UPDATE noticias n SET contenido = left(i->>'contenido', 2000)
    FROM jsonb_array_elements(coalesce(items, '[]')) i
   WHERE n.id = (i->>'id')::uuid AND n.categoria = (i->>'categoria')::categoria
     AND length(coalesce(i->>'contenido', '')) >= 300;
  -- Las candidatas se recalculan en cada corrida: una que fue candidata otro día (juzgada o no) vuelve a competir desde cero.
  UPDATE noticias SET candidata = false WHERE candidata;
  UPDATE noticias n SET candidata = true
    FROM (SELECT id, categoria, row_number() OVER (PARTITION BY categoria ORDER BY preseleccion) AS rn
            FROM noticias WHERE preseleccion IS NOT NULL AND (contenido IS NOT NULL OR prioridad)) t
   WHERE n.id = t.id AND n.categoria = t.categoria AND t.rn <= CANDIDATAS;
  SELECT jsonb_object_agg(categoria, x) INTO res FROM (
    SELECT categoria, jsonb_build_object(
             'preseleccionadas', count(*),
             'con_texto', count(*) FILTER (WHERE contenido IS NOT NULL),
             'candidatas', count(*) FILTER (WHERE candidata)) AS x
      FROM noticias WHERE preseleccion IS NOT NULL GROUP BY categoria) t;
  RETURN coalesce(res, '{}');
END $$;
