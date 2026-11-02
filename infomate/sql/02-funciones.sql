-- Infomate: funciones del workflow (pasos 4 y 6). Se puede volver a correr: reemplaza las funciones.

-- Título normalizado para comparar: minúsculas, sin acentos ni signos.
CREATE OR REPLACE FUNCTION f_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(lower(translate(coalesce(t, ''), 'áéíóúüñàèìòùâêîôûäëïöçÁÉÍÓÚÜÑ', 'aeiouunaeiouaeiouaeiocaeiouun')), '[^a-z0-9]+', ' ', 'g'))
$$;

ALTER TABLE noticias ADD COLUMN IF NOT EXISTS corrida text;   -- corrida en la que entró
-- Paso 7: al juez se le piden 450 caracteres, pero si se pasa el resumen entra igual. 1000 es solo la red.
ALTER TABLE noticias DROP CONSTRAINT IF EXISTS noticias_resumen_check;
ALTER TABLE noticias ADD CONSTRAINT noticias_resumen_check CHECK (char_length(resumen) <= 1000);
DROP INDEX IF EXISTS noticias_titulo_trgm;
CREATE INDEX IF NOT EXISTS noticias_norm_trgm ON noticias USING gin (f_norm(titulo_original) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS noticias_corrida ON noticias (corrida);
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS feed text;                                 -- feed de donde vino (Infobae deportes, HN...)
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS lugar real;                                -- lugar en su feed (0-1) por el peso de la fuente
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS prioridad boolean NOT NULL DEFAULT false;  -- n.º 1 de un feed prioritario en la última corrida
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS asegurada boolean NOT NULL DEFAULT false;  -- n.º 1 de un feed de país en la última corrida
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS ultima_corrida text;                       -- última corrida en la que apareció
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS preseleccion smallint;                     -- orden entre las 15 preseleccionadas (1 = mejor)
CREATE INDEX IF NOT EXISTS noticias_ultima_corrida ON noticias (ultima_corrida);

-- Puntaje previo, de 0 a 100 (acordado el 02/11/2026):
--   global y arg: 50 x lugar + 35 x cobertura + 15 x portada
--   tech:         70 x lugar + 30 x cobertura
-- lugar = (1 - (posición - 1) / noticias del feed) x peso de la fuente (ver fuentes.js).
-- cobertura: global y arg (medios - 1) / 5 con tope de 6 medios; tech (fuentes - 1) / 2 con tope de 3 (HN, Lobsters, Reddit).
-- La n.º 1 de un feed prioritario (HN, Google News Mundo, Google News Argentina) vale 100.
CREATE OR REPLACE FUNCTION infomate_puntaje_previo(n noticias) RETURNS real
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN n.prioridad THEN 100
    WHEN n.categoria = 'tech'
      THEN 70 * coalesce(n.lugar, 0) + 30 * (least(greatest(cardinality(n.medios), 1), 3) - 1) / 2.0
    ELSE 50 * coalesce(n.lugar, 0) + 35 * (least(greatest(cardinality(n.medios), 1), 6) - 1) / 5.0
         + CASE WHEN n.portada THEN 15 ELSE 0 END
  END::real
$$;

-- Ingresa los ítems del parser sin repetidas. Devuelve conteos por categoría.
CREATE OR REPLACE FUNCTION infomate_ingresar(items jsonb, portadas jsonb, p_corrida text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  UMBRAL  constant real     := 0.42;         -- mismo hecho si el título se parece 42 % o más
  VENTANA constant interval := '72 hours';
  TOPE    constant int      := 200;          -- nuevas por categoría y por corrida
  it jsonb; v_cat categoria; v_link text; v_gl text; n text; nid uuid; es_gn boolean;
  c jsonb := '{"global":{"nuevas":0,"unidas":0,"descartadas":0,"a_arg":0,"fuera_de_tope":0},
               "arg":{"nuevas":0,"unidas":0,"descartadas":0,"a_arg":0,"fuera_de_tope":0},
               "tech":{"nuevas":0,"unidas":0,"descartadas":0,"a_arg":0,"fuera_de_tope":0}}';
  sumar text[]; borradas int;
BEGIN
  PERFORM set_limit(UMBRAL);
  UPDATE noticias SET prioridad = false, asegurada = false WHERE prioridad OR asegurada;   -- valen solo para la corrida de hoy
  -- ARG primero: así una global que ya está en ARG se detecta y queda solo en ARG.
  FOR it IN SELECT value FROM jsonb_array_elements(items)
            ORDER BY (value->>'categoria') = 'arg' DESC, (value->>'posicion')::int LOOP
    v_cat := (it->>'categoria')::categoria;
    v_link := it->>'link'; v_gl := it->>'link_google';
    es_gn := v_gl IS NOT NULL AND v_link = v_gl;
    n := f_norm(it->>'titulo_original');
    IF length(n) < 10 OR v_link IS NULL OR it->>'fuente' IS NULL THEN
      c := jsonb_set(c, ARRAY[v_cat::text, 'descartadas'], to_jsonb((c->v_cat::text->>'descartadas')::int + 1)); CONTINUE;
    END IF;

    IF v_cat = 'global' AND EXISTS (
         SELECT 1 FROM noticias WHERE categoria = 'arg' AND ultima_vez > now() - VENTANA
           AND (link = v_link OR f_norm(titulo_original) % n)) THEN
      c := jsonb_set(c, '{global,a_arg}', to_jsonb((c->'global'->>'a_arg')::int + 1)); CONTINUE;
    END IF;

    SELECT id INTO nid FROM noticias
     WHERE categoria = v_cat AND (link = v_link OR link_google = v_link)
     LIMIT 1;
    IF nid IS NULL THEN
      SELECT id INTO nid FROM noticias
       WHERE categoria = v_cat AND ultima_vez > now() - VENTANA AND f_norm(titulo_original) % n
       ORDER BY similarity(f_norm(titulo_original), n) DESC LIMIT 1;
    END IF;

    sumar := ARRAY(SELECT jsonb_array_elements_text(coalesce(it->'medios', '[]')));
    IF nid IS NULL THEN
      INSERT INTO noticias (categoria, titulo_original, descripcion_fuente, contenido, link, link_google, fuente, medios,
                            fecha_publicacion, posicion, puntos, comentarios, corrida,
                            feed, lugar, prioridad, asegurada, ultima_corrida)
      VALUES (v_cat, it->>'titulo_original', it->>'descripcion_fuente', it->>'contenido', v_link, v_gl, it->>'fuente', sumar,
              (it->>'fecha_publicacion')::timestamptz, (it->>'posicion')::int, (it->>'puntos')::int, (it->>'comentarios')::int, p_corrida,
              it->>'feed', (it->>'lugar')::real, coalesce((it->>'prioridad')::boolean, false), coalesce((it->>'asegurada')::boolean, false), p_corrida);
      c := jsonb_set(c, ARRAY[v_cat::text, 'nuevas'], to_jsonb((c->v_cat::text->>'nuevas')::int + 1));
    ELSE
      UPDATE noticias x SET
        medios = ARRAY(SELECT DISTINCT unnest(x.medios || sumar)),
        posicion = least(x.posicion, (it->>'posicion')::int),
        puntos = greatest(x.puntos, (it->>'puntos')::int),
        comentarios = greatest(x.comentarios, (it->>'comentarios')::int),
        descripcion_fuente = CASE WHEN length(coalesce(it->>'descripcion_fuente', '')) > length(coalesce(x.descripcion_fuente, ''))
                                  THEN it->>'descripcion_fuente' ELSE x.descripcion_fuente END,
        contenido = CASE WHEN length(coalesce(it->>'contenido', '')) > length(coalesce(x.contenido, ''))
                         THEN it->>'contenido' ELSE x.contenido END,
        fecha_publicacion = least(x.fecha_publicacion, (it->>'fecha_publicacion')::timestamptz),
        link_google = coalesce(x.link_google, v_gl),
        -- Si la guardada tenía el link de Google News y llega el del medio, se queda con el del medio.
        link = CASE WHEN x.link = x.link_google AND NOT es_gn
                     AND NOT EXISTS (SELECT 1 FROM noticias o WHERE o.categoria = v_cat AND o.link = v_link)
                    THEN v_link ELSE x.link END,
        fuente = CASE WHEN x.link = x.link_google AND NOT es_gn THEN it->>'fuente' ELSE x.fuente END,
        -- El lugar de una corrida anterior no cuenta: se reemplaza por el de hoy y, dentro de hoy, gana el mejor.
        feed = CASE WHEN x.ultima_corrida IS DISTINCT FROM p_corrida OR coalesce((it->>'lugar')::real, 0) > coalesce(x.lugar, 0)
                    THEN coalesce(it->>'feed', x.feed) ELSE x.feed END,
        lugar = CASE WHEN x.ultima_corrida IS DISTINCT FROM p_corrida THEN (it->>'lugar')::real
                     ELSE greatest(x.lugar, (it->>'lugar')::real) END,
        prioridad = x.prioridad OR coalesce((it->>'prioridad')::boolean, false),
        asegurada = x.asegurada OR coalesce((it->>'asegurada')::boolean, false),
        ultima_corrida = p_corrida,
        ultima_vez = now()
      WHERE x.id = nid AND x.categoria = v_cat;
      c := jsonb_set(c, ARRAY[v_cat::text, 'unidas'], to_jsonb((c->v_cat::text->>'unidas')::int + 1));
    END IF;
  END LOOP;

  -- Portadas: marcan las que ya están en su categoría.
  UPDATE noticias x SET portada = true
   FROM jsonb_array_elements(coalesce(portadas, '[]')) p
   WHERE x.categoria = (p->>'categoria')::categoria AND x.ultima_vez > now() - VENTANA
     AND f_norm(x.titulo_original) % f_norm(p->>'titulo');

  UPDATE noticias x SET puntaje_previo = infomate_puntaje_previo(x) WHERE x.ultima_corrida = p_corrida;

  -- Tope: de las que entraron en esta corrida, quedan las 200 de mayor puntaje previo por categoría.
  WITH fuera AS (
    SELECT id, categoria FROM (
      SELECT id, categoria, row_number() OVER (PARTITION BY categoria ORDER BY puntaje_previo DESC, posicion) AS rn
      FROM noticias WHERE corrida = p_corrida) t
    WHERE rn > TOPE AND NOT EXISTS (SELECT 1 FROM diaria d WHERE d.noticia_id = t.id))
  , b AS (DELETE FROM noticias x USING fuera f WHERE x.id = f.id AND x.categoria = f.categoria RETURNING x.categoria)
  SELECT array_agg(categoria::text) INTO sumar FROM b;
  FOR v_cat IN SELECT DISTINCT unnest(sumar)::categoria LOOP
    SELECT count(*) INTO borradas FROM unnest(sumar) s WHERE s = v_cat::text;
    c := jsonb_set(c, ARRAY[v_cat::text, 'fuera_de_tope'], to_jsonb(borradas));
    c := jsonb_set(c, ARRAY[v_cat::text, 'nuevas'], to_jsonb((c->v_cat::text->>'nuevas')::int - borradas));
  END LOOP;
  RETURN c;
END $$;

-- Borra lo recolectado hace más de 7 días que no salió en la diaria.
CREATE OR REPLACE FUNCTION infomate_limpiar() RETURNS int
LANGUAGE sql AS $$
  WITH b AS (DELETE FROM noticias n WHERE n.ultima_vez < now() - interval '7 days'
             AND NOT EXISTS (SELECT 1 FROM diaria d WHERE d.noticia_id = n.id) RETURNING 1)
  SELECT count(*)::int FROM b
$$;

-- Cierra la corrida: limpia y guarda los conteos.
CREATE OR REPLACE FUNCTION infomate_cerrar(p_corrida text, p_estado text, p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE borradas int := infomate_limpiar(); d jsonb;
BEGIN
  d := coalesce(p_datos, '{}') || jsonb_build_object('borradas_por_antiguedad', borradas,
         'total_por_categoria', (SELECT jsonb_object_agg(categoria, n) FROM (SELECT categoria, count(*) n FROM noticias GROUP BY 1) t));
  INSERT INTO corridas (id, fin, estado, datos) VALUES (p_corrida, now(), p_estado, d)
  ON CONFLICT (id) DO UPDATE SET fin = now(), estado = excluded.estado, datos = excluded.datos;
  RETURN d;
END $$;
