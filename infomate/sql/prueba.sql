-- Prueba del esquema: se corre sobre una base vacía después de 01-esquema.sql (ver probar.sh).
-- Si algo no cumple, corta con un error que dice qué falló.
\set ON_ERROR_STOP 1

INSERT INTO noticias (id, categoria, titulo_original, titulo, resumen, contenido, link, fuente, fecha_publicacion, puntaje) VALUES
 ('00000000-0000-0000-0000-000000000001', 'arg',    'El Banco Central baja la tasa', 'El Banco Central baja la tasa', 'Resumen ARG', 'Texto ARG', 'https://www.lanacion.com.ar/economia/tasa', 'La Nación', '2026-11-02 10:45:00+00', 87),
 ('00000000-0000-0000-0000-000000000002', 'global', 'EU agrees on new climate target', 'La UE acuerda una nueva meta climática', 'Resumen global', 'Text in English', 'https://www.bbc.com/news/climate', 'BBC', '2026-11-02 06:00:00+00', 91),
 ('00000000-0000-0000-0000-000000000003', 'tech',   'Postgres 18 released', 'Sale Postgres 18', 'Resumen tech', 'Text', 'https://www.postgresql.org/about/news/18', 'HN', '2026-11-01 22:30:00+00', 74);

INSERT INTO diaria (fecha, categoria, orden, noticia_id) VALUES
 ('2026-11-02', 'arg',    1, '00000000-0000-0000-0000-000000000001'),
 ('2026-11-02', 'global', 1, '00000000-0000-0000-0000-000000000002'),
 ('2026-11-02', 'tech',   1, '00000000-0000-0000-0000-000000000003');

DO $$
DECLARE e jsonb; ok boolean;
BEGIN
  -- Cada noticia cae en la tabla de su categoría.
  IF (SELECT count(*) FROM arg) <> 1 OR (SELECT count(*) FROM global) <> 1 OR (SELECT count(*) FROM tech) <> 1 THEN
    RAISE EXCEPTION 'particiones: cada tabla por categoría debería tener 1 fila';
  END IF;

  -- La edición sale ordenada por puntaje y con el formato de la app.
  e := edicion('2026-11-02');
  IF jsonb_array_length(e) <> 3 THEN RAISE EXCEPTION 'edicion: esperaba 3 noticias, hay %', jsonb_array_length(e); END IF;
  IF e->0->>'categoria' <> 'global' OR e->2->>'categoria' <> 'tech' THEN RAISE EXCEPTION 'edicion: orden por puntaje incorrecto: %', e; END IF;
  IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(e->0) k) <>
     ARRAY['categoria','contenido','descripcion','fecha_publicacion','fuente','id','link','puntaje','titulo','titulo_original'] THEN
    RAISE EXCEPTION 'edicion: claves del JSON distintas a las del formato: %', e->0;
  END IF;
  -- 10:45 UTC = 07:45 en Argentina.
  IF e->1->>'fecha_publicacion' <> '02/11/2026 07:45' THEN RAISE EXCEPTION 'fecha_publicacion mal formateada: %', e->1->>'fecha_publicacion'; END IF;
  IF edicion('2026-11-03') <> '[]'::jsonb THEN RAISE EXCEPTION 'edicion de un día sin noticias debería ser []'; END IF;

  -- Resumen de más de 500 caracteres: rechazado.
  ok := false;
  BEGIN
    INSERT INTO noticias (categoria, titulo_original, link, fuente, resumen) VALUES ('arg', 't', 'https://x/1', 'f', repeat('a', 501));
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'resumen de 501 caracteres debería rechazarse'; END IF;

  -- Contenido de más de 2000 caracteres: rechazado.
  ok := false;
  BEGIN
    INSERT INTO noticias (categoria, titulo_original, link, fuente, contenido) VALUES ('arg', 't', 'https://x/2', 'f', repeat('a', 2001));
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'contenido de 2001 caracteres debería rechazarse'; END IF;

  -- Puntaje fuera de 0 a 100: rechazado.
  ok := false;
  BEGIN
    INSERT INTO noticias (categoria, titulo_original, link, fuente, puntaje) VALUES ('arg', 't', 'https://x/3', 'f', 101);
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'puntaje 101 debería rechazarse'; END IF;

  -- Mismo link en la misma categoría: rechazado.
  ok := false;
  BEGIN
    INSERT INTO noticias (categoria, titulo_original, link, fuente) VALUES ('arg', 'otra', 'https://www.lanacion.com.ar/economia/tasa', 'f');
  EXCEPTION WHEN unique_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'link repetido en la misma categoría debería rechazarse'; END IF;

  -- Más de 5 por categoría en la diaria: rechazado.
  ok := false;
  BEGIN
    INSERT INTO diaria VALUES ('2026-11-02', 'arg', 6, '00000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'orden 6 en la diaria debería rechazarse'; END IF;

  -- La diaria no acepta una noticia de otra categoría.
  INSERT INTO noticias (id, categoria, titulo_original, link, fuente)
    VALUES ('00000000-0000-0000-0000-000000000004', 'arg', 'Otra de ARG', 'https://x/4', 'Infobae');
  ok := false;
  BEGIN
    INSERT INTO diaria VALUES ('2026-11-02', 'global', 2, '00000000-0000-0000-0000-000000000004');
  EXCEPTION WHEN foreign_key_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'diaria con categoría distinta a la de la noticia debería rechazarse'; END IF;

  RAISE NOTICE 'PRUEBA OK';
END $$;
