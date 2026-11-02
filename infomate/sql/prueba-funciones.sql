-- Prueba de las funciones del paso 4, sobre una base vacía con 01-esquema.sql y 02-funciones.sql (ver probar.sh).
\set ON_ERROR_STOP 1

DO $$
DECLARE r jsonb; n int; v_link text; v_medios text[]; v_fuente text;
  it_rss  jsonb := '{"categoria":"arg","fuente":"Infobae","titulo_original":"El Gobierno anunció cambios en el Gabinete nacional","link":"https://infobae.com/politica/gabinete","medios":["Infobae"],"posicion":1,"fecha_publicacion":"2026-11-02T10:00:00Z","contenido":"Texto"}';
  it_gn   jsonb := '{"categoria":"arg","fuente":"La Nación","titulo_original":"El Gobierno anunció cambios en el Gabinete nacional hoy","link":"https://news.google.com/rss/articles/AAA","link_google":"https://news.google.com/rss/articles/AAA","medios":["La Nación","Clarín"],"posicion":3,"fecha_publicacion":"2026-11-02T09:00:00Z"}';
  it_glob jsonb := '{"categoria":"global","fuente":"BBC Mundo","titulo_original":"El Gobierno anunció cambios en el Gabinete nacional","link":"https://bbc.com/mundo/x","medios":["BBC Mundo"],"posicion":2}';
  it_tech jsonb := '{"categoria":"tech","fuente":"HN","titulo_original":"Postgres 18 released with new features","link":"https://postgresql.org/about/news/18","medios":["HN"],"posicion":1,"puntos":120,"comentarios":40}';
BEGIN
  -- Google News primero; después el mismo hecho desde el feed del medio: se unen y queda el link del medio.
  r := infomate_ingresar(jsonb_build_array(it_gn), '[]', 'c1');
  IF (r->'arg'->>'nuevas')::int <> 1 THEN RAISE EXCEPTION 'GN: esperaba 1 nueva: %', r; END IF;
  r := infomate_ingresar(jsonb_build_array(it_rss, it_tech), '[{"categoria":"arg","titulo":"El Gobierno anunció cambios en el Gabinete nacional"}]', 'c2');
  IF (r->'arg'->>'unidas')::int <> 1 OR (r->'arg'->>'nuevas')::int <> 0 THEN RAISE EXCEPTION 'título parecido debería unirse: %', r; END IF;
  SELECT count(*), max(link), max(fuente) INTO n, v_link, v_fuente FROM arg;
  SELECT medios INTO v_medios FROM arg;
  IF n <> 1 THEN RAISE EXCEPTION 'ARG debería tener 1 noticia, tiene %', n; END IF;
  IF v_link <> 'https://infobae.com/politica/gabinete' OR v_fuente <> 'Infobae' THEN RAISE EXCEPTION 'debería quedar el link del medio: % %', v_link, v_fuente; END IF;
  IF NOT v_medios @> ARRAY['Infobae','La Nación','Clarín'] THEN RAISE EXCEPTION 'medios no se sumaron: %', v_medios; END IF;
  IF NOT (SELECT portada FROM arg) THEN RAISE EXCEPTION 'la portada no se marcó'; END IF;
  IF (SELECT contenido FROM arg) <> 'Texto' THEN RAISE EXCEPTION 'contenido del feed no se guardó'; END IF;
  IF (SELECT fecha_publicacion FROM arg) <> '2026-11-02T09:00:00Z' THEN RAISE EXCEPTION 'fecha_publicacion debería ser la más temprana'; END IF;

  -- Mismo link otra vez: no duplica. Mismo hecho en global: queda solo en ARG.
  r := infomate_ingresar(jsonb_build_array(it_rss, it_glob, it_tech), '[]', 'c3');
  IF (SELECT count(*) FROM arg) <> 1 OR (SELECT count(*) FROM tech) <> 1 THEN RAISE EXCEPTION 'link repetido duplicó: %', r; END IF;
  IF (SELECT count(*) FROM global) <> 0 OR (r->'global'->>'a_arg')::int <> 1 THEN RAISE EXCEPTION 'la global que ya está en ARG no debería entrar: %', r; END IF;

  -- Puntaje previo calculado; tech por votos.
  IF (SELECT puntaje_previo FROM tech) IS NULL OR (SELECT puntaje_previo FROM arg) IS NULL THEN RAISE EXCEPTION 'falta puntaje_previo'; END IF;

  -- Título demasiado corto: descartado.
  r := infomate_ingresar('[{"categoria":"tech","fuente":"HN","titulo_original":"Hola","link":"https://x.org/1","medios":["HN"],"posicion":1}]', '[]', 'c4');
  IF (r->'tech'->>'descartadas')::int <> 1 THEN RAISE EXCEPTION 'título corto debería descartarse: %', r; END IF;

  -- Tope: 250 nuevas de tech en una corrida, quedan 200 (las de mejor lugar, que acá son las de más votos).
  r := infomate_ingresar((SELECT jsonb_agg(jsonb_build_object('categoria','tech','fuente','HN',
          'titulo_original', 'Historia distinta numero ' || i || ' sobre tema ' || md5(i::text),
          'link','https://ej.org/' || i, 'medios', '["HN"]'::jsonb, 'posicion', i, 'puntos', i, 'lugar', i / 250.0)) FROM generate_series(1, 250) i), '[]', 'c5');
  IF (SELECT count(*) FROM tech WHERE corrida = 'c5') <> 200 THEN RAISE EXCEPTION 'tope: quedaron % de c5', (SELECT count(*) FROM tech WHERE corrida = 'c5'); END IF;
  IF (r->'tech'->>'fuera_de_tope')::int <> 50 OR (r->'tech'->>'nuevas')::int <> 200 THEN RAISE EXCEPTION 'tope: conteos mal: %', r; END IF;
  IF EXISTS (SELECT 1 FROM tech WHERE corrida = 'c5' AND puntos <= 50) THEN RAISE EXCEPTION 'tope: debían quedar las de más votos'; END IF;

  -- Limpieza: lo de más de 7 días se borra salvo lo que está en diaria.
  UPDATE noticias SET ultima_vez = now() - interval '8 days';
  INSERT INTO diaria VALUES (current_date, 'arg', 1, (SELECT id FROM arg));
  n := infomate_limpiar();
  IF (SELECT count(*) FROM noticias) <> 1 OR NOT EXISTS (SELECT 1 FROM arg) THEN RAISE EXCEPTION 'limpieza: debería quedar solo la de diaria (borró %)', n; END IF;

  -- Cerrar corrida: guarda fila con conteos.
  r := infomate_cerrar('c6', 'ok', '{"x":1}');
  IF (SELECT estado FROM corridas WHERE id = 'c6') <> 'ok' OR (r->'total_por_categoria'->>'arg')::int <> 1 THEN RAISE EXCEPTION 'cerrar: %', r; END IF;

  RAISE NOTICE 'PRUEBA FUNCIONES OK';
END $$;
