-- Prueba del paso 6: puntaje previo, preselección, links reales y texto. Base vacía con 01, 02 y 03 (ver probar.sh).
\set ON_ERROR_STOP 1

CREATE FUNCTION pp(t text) RETURNS real LANGUAGE sql AS $$ SELECT puntaje_previo FROM noticias WHERE titulo_original = t $$;
CREATE FUNCTION it(cat text, feed text, titulo text, lugar real, medios text[], prio boolean DEFAULT false, link text DEFAULT NULL, aseg boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql AS $$ SELECT jsonb_build_object('categoria', cat, 'feed', feed, 'fuente', coalesce(medios[1], feed), 'titulo_original', titulo,
  'link', coalesce(link, 'https://ej.org/' || md5(titulo)), 'lugar', lugar, 'medios', to_jsonb(medios), 'prioridad', prio, 'asegurada', aseg, 'posicion', 1) $$;

DO $$
DECLARE r jsonb; n int;
BEGIN
  r := infomate_ingresar(jsonb_build_array(
    it('global', 'Infobae', 'Exclusiva de un solo medio sobre la cumbre del clima', 1.0, '{Infobae}'),
    it('global', 'Google News EE.UU.', 'Contiendas demócratas en las elecciones de mitad de mandato', 0.92, '{CNN,A,B,C,D}'),
    it('global', 'DW', 'Casi ochocientos detenidos en Francia tras las protestas', 0.93, '{DW,A,B,C,D,E,F,G}'),
    it('global', 'Google News Mundo', 'La primera noticia de Google News Mundo hoy', 1.0, '{X}', true),
    it('tech', 'HN', 'La historia más votada de Hacker News hoy', 1.0, '{HN,Lobsters}'),
    it('tech', 'r/artificial', 'La primera de r/artificial en el día de hoy', 0.7, '{r/artificial}')),
    '[{"categoria":"global","titulo":"Exclusiva de un solo medio sobre la cumbre del clima"}]', 'k1');

  -- Escala de 0 a 100 con los pesos acordados.
  IF round(pp('Exclusiva de un solo medio sobre la cumbre del clima')) <> 65 THEN RAISE EXCEPTION 'un medio + portada: esperaba 65, dio %', pp('Exclusiva de un solo medio sobre la cumbre del clima'); END IF;
  IF round(pp('Contiendas demócratas en las elecciones de mitad de mandato')) <> 74 THEN RAISE EXCEPTION 'GN 5 medios: esperaba 74, dio %', pp('Contiendas demócratas en las elecciones de mitad de mandato'); END IF;
  IF round(pp('Casi ochocientos detenidos en Francia tras las protestas')) <> 82 THEN RAISE EXCEPTION 'tope de 6 medios: esperaba 82, dio %', pp('Casi ochocientos detenidos en Francia tras las protestas'); END IF;
  IF pp('La primera noticia de Google News Mundo hoy') <> 100 THEN RAISE EXCEPTION 'prioritaria debería valer 100'; END IF;
  IF round(pp('La historia más votada de Hacker News hoy')) <> 85 THEN RAISE EXCEPTION 'HN en 2 fuentes: esperaba 85, dio %', pp('La historia más votada de Hacker News hoy'); END IF;
  IF round(pp('La primera de r/artificial en el día de hoy')) <> 49 THEN RAISE EXCEPTION 'r/artificial con peso 0,7: esperaba 49, dio %', pp('La primera de r/artificial en el día de hoy'); END IF;
  IF (SELECT max(puntaje_previo) FROM noticias) > 100 OR (SELECT min(puntaje_previo) FROM noticias) < 0 THEN RAISE EXCEPTION 'fuera de 0 a 100'; END IF;

  -- En otra corrida la prioridad de ayer no cuenta.
  PERFORM infomate_ingresar(jsonb_build_array(it('tech', 'HN', 'Otra historia de Hacker News de otro día', 0.5, '{HN}')), '[]', 'k0');
  IF (SELECT bool_or(prioridad) FROM noticias) THEN RAISE EXCEPTION 'la prioridad debería borrarse en cada corrida'; END IF;
  TRUNCATE diaria, noticias;

  -- Preselección: 6 de Google News EE.UU. con mucho puntaje: entran 2 (tope especial). La prioritaria entra primera aunque el feed esté lleno.
  r := infomate_ingresar((SELECT jsonb_agg(it('global', 'Google News EE.UU.', (ARRAY['El Senado aprueba la ley de presupuesto','Un huracán golpea la costa de Florida','La Reserva Federal sube las tasas de interés','Incendio forestal avanza sobre California','Resultados de la elección en Nueva York','Huelga de actores paraliza Hollywood'])[i], 1.0 - i / 100.0, '{A,B,C,D,E,F}')) FROM generate_series(1, 6) i)
      || jsonb_build_array(
         it('global', 'Google News EE.UU.', 'La primera prioritaria del feed para la prueba', 0.5, '{A}', true),
         it('global', 'DW', 'Elecciones en Bulgaria con la candidata favorita', 0.2, '{DW}'),
         it('global', 'DW', 'Elecciones en Bulgaria con la candidata favorita ganadora', 0.1, '{DW}', false, 'https://dw.com/otra'),
         it('global', 'BBC Mundo', 'Terremoto en Japón deja daños en la costa', 0.3, '{BBC}'),
         it('global', 'Google News China', 'Xi Jinping meets Gulf leaders on new trade deal', 0.05, '{SCMP}', false, NULL, true),
         it('global', 'Google News China', 'China central bank cuts the main policy rate', 0.9, '{Reuters}', false, NULL, true),
         it('global', 'Google News China', 'Chinese robot makers race to build smarter machines', 0.04, '{Guardian}', false, NULL, true))
      || (SELECT jsonb_agg(it('arg', 'Infobae deportes', (ARRAY['Boca le ganó a River en el Superclásico','Colapinto sumó puntos en México','Los Pumas vencieron a Francia en París','Racing campeón de la Copa Sudamericana','Del Potro anunció un partido de despedida'])[i], 1.0, '{Infobae}')) FROM generate_series(1, 5) i)
      || jsonb_build_array(it('arg', 'La Nación política', 'El Congreso debate el presupuesto nacional', 0.1, '{La Nación}')),
      '[]', 'k2');
  r := infomate_preseleccionar('k2');
  IF (SELECT preseleccion FROM noticias WHERE titulo_original = 'La primera prioritaria del feed para la prueba') <> 1 THEN RAISE EXCEPTION 'la prioritaria debería ser la 1'; END IF;
  IF (SELECT count(*) FROM noticias WHERE feed = 'Google News EE.UU.' AND preseleccion IS NOT NULL AND NOT prioridad) <> 2 THEN RAISE EXCEPTION 'tope de Google News EE.UU.: esperaba 2'; END IF;
  IF (SELECT preseleccion FROM noticias WHERE titulo_original LIKE 'Xi Jinping%') <> 2 THEN RAISE EXCEPTION 'la asegurada legible de China debería entrar segunda, después de la prioritaria'; END IF;
  IF (SELECT preseleccion FROM noticias WHERE titulo_original LIKE 'China central bank%') IS NOT NULL THEN RAISE EXCEPTION 'Reuters no se puede leer: no debería preseleccionarse'; END IF;
  IF (SELECT preseleccion FROM noticias WHERE titulo_original LIKE 'Chinese robot makers%') IS NOT NULL THEN RAISE EXCEPTION 'un solo lugar asegurado por país'; END IF;
  IF (SELECT count(*) FROM noticias WHERE feed = 'Infobae deportes' AND preseleccion IS NOT NULL) <> 3 THEN RAISE EXCEPTION 'tope de deportes: esperaba 3'; END IF;
  IF (SELECT count(*) FROM noticias WHERE titulo_original LIKE 'Elecciones en Bulgaria%' AND preseleccion IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'dos parecidas: debería quedar una'; END IF;
  IF (SELECT preseleccion FROM noticias WHERE titulo_original = 'Terremoto en Japón deja daños en la costa') IS NULL THEN RAISE EXCEPTION 'BBC debería entrar'; END IF;
  IF (r->>'global')::int <> 6 OR (r->>'arg')::int <> 4 THEN RAISE EXCEPTION 'conteos: %', r; END IF;


  -- Lo publicado en diaria esta semana no vuelve a preseleccionarse.
  INSERT INTO diaria VALUES (current_date - 1, 'global', 1, (SELECT id FROM noticias WHERE titulo_original = 'Terremoto en Japón deja daños en la costa'));
  PERFORM infomate_preseleccionar('k2');
  IF (SELECT preseleccion FROM noticias WHERE titulo_original = 'Terremoto en Japón deja daños en la costa') IS NOT NULL THEN RAISE EXCEPTION 'lo publicado ayer no debería volver'; END IF;

  -- Links reales: se cambia el de Google News; si choca con otro de la misma categoría, no.
  UPDATE noticias SET link = 'https://news.google.com/rss/articles/AAA', link_google = 'https://news.google.com/rss/articles/AAA'
   WHERE titulo_original = 'La primera prioritaria del feed para la prueba';
  n := infomate_guardar_links(jsonb_build_array(
    jsonb_build_object('id', (SELECT id FROM noticias WHERE titulo_original = 'La primera prioritaria del feed para la prueba'), 'categoria', 'global', 'link', 'https://cnn.com/nota'),
    jsonb_build_object('id', (SELECT id FROM noticias WHERE titulo_original = 'Elecciones en Bulgaria con la candidata favorita'), 'categoria', 'global', 'link', (SELECT link FROM noticias WHERE titulo_original = 'Terremoto en Japón deja daños en la costa'))));
  IF n <> 1 OR (SELECT link FROM noticias WHERE titulo_original = 'La primera prioritaria del feed para la prueba') <> 'https://cnn.com/nota' THEN RAISE EXCEPTION 'guardar_links: %', n; END IF;

  -- Texto: se guarda si tiene 300 o más; quedan candidatas las primeras con texto (hasta 10 por categoría).
  r := infomate_guardar_texto((SELECT jsonb_agg(jsonb_build_object('id', id, 'categoria', categoria,
          'contenido', CASE WHEN preseleccion % 2 = 1 AND NOT prioridad THEN repeat('texto ', 500) ELSE 'corto' END))
        FROM noticias WHERE preseleccion IS NOT NULL));
  IF EXISTS (SELECT 1 FROM noticias WHERE length(contenido) > 2000) THEN RAISE EXCEPTION 'contenido de más de 2000'; END IF;
  IF EXISTS (SELECT 1 FROM noticias WHERE candidata AND contenido IS NULL AND NOT prioridad) THEN RAISE EXCEPTION 'candidata sin texto'; END IF;
  IF NOT (SELECT candidata FROM noticias WHERE titulo_original = 'La primera prioritaria del feed para la prueba') THEN RAISE EXCEPTION 'la prioritaria sin texto debería ser candidata'; END IF;
  -- global: 5 preseleccionadas (el terremoto quedó afuera por diaria); la 1 es la prioritaria sin texto;
  -- con texto las impares no prioritarias (3 y 5) = 2. Candidatas = 2 + la prioritaria = 3.
  IF (r->'global'->>'con_texto')::int <> 2 OR (r->'global'->>'candidatas')::int <> 3 THEN RAISE EXCEPTION 'guardar_texto: %', r; END IF;


  -- Tech preselecciona 20 (las demás 15).
  PERFORM infomate_ingresar((SELECT jsonb_agg(jsonb_build_object('categoria','tech','feed',(ARRAY['HN','Lobsters','r/technology','r/programming','r/artificial'])[i % 5 + 1],'fuente','HN','titulo_original', 'Historia ' || i || ' ' || md5(i::text) || ' ' || md5((i*7)::text),
            'link','https://t.org/' || i, 'medios', '["HN"]'::jsonb, 'posicion', i, 'lugar', 1 - i / 30.0)) FROM generate_series(1, 25) i), '[]', 'k2');
  r := infomate_preseleccionar('k2');
  IF (r->>'tech')::int <> 20 THEN RAISE EXCEPTION 'tech debería preseleccionar 20 (5 feeds x 4): %', r; END IF;

  RAISE NOTICE 'PRUEBA PRESELECCION OK';
END $$;
