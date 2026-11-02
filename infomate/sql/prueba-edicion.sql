-- Prueba del paso 8: guardar el juicio y armar la edición. Base vacía con 01 a 04 (ver probar.sh).
\set ON_ERROR_STOP 1

CREATE FUNCTION nota(cat categoria, t text, presel int, previo real, cand boolean DEFAULT true) RETURNS uuid
LANGUAGE sql AS $$ INSERT INTO noticias (categoria, titulo_original, link, fuente, preseleccion, puntaje_previo, candidata)
  VALUES (cat, t, 'https://ej.org/' || md5(t), 'f', presel, previo, cand) RETURNING id $$;

DO $$
DECLARE r jsonb; n int; hoy date := '2026-11-02';
BEGIN
  -- ARG: 7 candidatas juzgadas; C y D empatan en puntaje y desempata el puntaje previo.
  PERFORM nota('arg', t, i::int, (100 - i)::real) FROM unnest(ARRAY['A','B','C','D','E','F','G']) WITH ORDINALITY x(t, i);
  -- Una vieja: candidata con puntaje alto pero de otra corrida (sin preseleccion). No entra.
  PERFORM nota('arg', 'Vieja', NULL, 50);
  -- Una candidata que el juez no pudo puntuar. No entra.
  PERFORM nota('arg', 'Sin puntaje', 8, 99);
  -- Tech: solo 3 juzgadas.
  PERFORM nota('tech', t, i::int, 50) FROM unnest(ARRAY['T1','T2','T3']) WITH ORDINALITY x(t, i);

  n := infomate_juzgar((SELECT jsonb_agg(jsonb_build_object('id', id, 'categoria', categoria, 'titulo_es', 'ES ' || titulo_original,
         'resumen', 'Resumen de ' || titulo_original, 'motivo', 'm',
         'puntaje', CASE titulo_original WHEN 'A' THEN 40 WHEN 'B' THEN 90 WHEN 'C' THEN 70 WHEN 'D' THEN 70 WHEN 'E' THEN 20
                                         WHEN 'F' THEN 60 WHEN 'G' THEN 80 WHEN 'Vieja' THEN 99 ELSE 30 END))
       FROM noticias WHERE titulo_original <> 'Sin puntaje'));
  IF n <> 11 THEN RAISE EXCEPTION 'juzgar: esperaba 11, guardó %', n; END IF;
  IF (SELECT titulo FROM noticias WHERE titulo_original = 'B') <> 'ES B' OR (SELECT juzgada FROM noticias WHERE titulo_original = 'B') IS NULL
    THEN RAISE EXCEPTION 'juzgar no guardó título o fecha'; END IF;

  r := infomate_armar_edicion(hoy);
  IF r <> '{"global": 0, "arg": 5, "tech": 3}'::jsonb THEN RAISE EXCEPTION 'conteos de la edición: %', r; END IF;
  IF (SELECT string_agg(n.titulo_original, ',' ORDER BY d.orden) FROM diaria d JOIN noticias n ON n.id = d.noticia_id
      WHERE d.fecha = hoy AND d.categoria = 'arg') <> 'B,G,C,D,F'
    THEN RAISE EXCEPTION 'orden de ARG: esperaba B,G,C,D,F (C antes que D por puntaje previo)'; END IF;

  -- Segunda corrida el mismo día: reemplaza la edición sin duplicar.
  UPDATE noticias SET puntaje = 95 WHERE titulo_original = 'E';
  r := infomate_armar_edicion(hoy);
  IF (SELECT count(*) FROM diaria WHERE fecha = hoy) <> 8 THEN RAISE EXCEPTION 'la segunda corrida duplicó la edición'; END IF;
  IF (SELECT n.titulo_original FROM diaria d JOIN noticias n ON n.id = d.noticia_id WHERE d.fecha = hoy AND d.categoria = 'arg' AND d.orden = 1) <> 'E'
    THEN RAISE EXCEPTION 'la segunda corrida debería reemplazar la edición'; END IF;

  -- La edición sale con el formato de la app.
  IF jsonb_array_length(edicion(hoy)) <> 8 OR (edicion(hoy)->0->>'titulo') <> 'ES E' OR (edicion(hoy)->0->>'descripcion') <> 'Resumen de E'
    THEN RAISE EXCEPTION 'edicion(): %', edicion(hoy)->0; END IF;

  RAISE NOTICE 'PRUEBA EDICION OK';
END $$;
