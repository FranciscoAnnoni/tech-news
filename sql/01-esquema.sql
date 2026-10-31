-- Noticias Tech · esquema + ingreso + ranking (base `noticias`, dueño `noticias`). Idempotente. Sin IA.
-- Fuentes: Hacker News (Algolia), Reddit (RSS de 3 subreddits), Lobsters (hasta el 28/10: Dev.to). En inglés.
-- Una fila por HECHO: si HN y Reddit traen la misma nota, queda una sola con las dos fuentes.
-- Necesita 00-requisitos.sql (extensiones pg_trgm y unaccent, y la función f_norm).
-- Uso (desde n8n): SELECT tech_ingresar($1::jsonb, $2::text);  -- $1 = items del parser, $2 = id de corrida

CREATE TABLE IF NOT EXISTS tech_noticias (
  id             bigserial PRIMARY KEY,
  titulo         text        NOT NULL,
  descripcion    text,                                 -- la que trae la fuente (Dev.to, texto de Reddit); HN no trae
  texto          text,                                 -- texto completo de la nota (se baja a pedido, parte 2)
  link           text        NOT NULL,                 -- nota original (o la discusión si es un post sin link)
  discusion      text,                                 -- página de comentarios (HN / Reddit / Dev.to)
  dominio        text,                                 -- sitio de la nota (github.com, theverge.com…)
  tags           text[]      NOT NULL DEFAULT '{}',    -- Dev.to
  puntos         int,                                  -- máximo visto: puntos HN / reacciones Dev.to (Reddit RSS no trae)
  comentarios    int,
  fuentes        text[]      NOT NULL DEFAULT '{}',    -- hn / r/technology / r/programming / r/artificial / devto
  origenes       jsonb       NOT NULL DEFAULT '[]',    -- [{fuente, titulo, link, discusion, posicion, puntos}]
  mejor_posicion int,                                  -- mejor puesto dentro de su fuente (1 = la más votada)
  corridas       int         NOT NULL DEFAULT 1,       -- en cuántas recolecciones diarias apareció
  ultima_corrida text,
  publicada      timestamptz,
  primera_vez    timestamptz NOT NULL DEFAULT now(),
  ultima_vez     timestamptz NOT NULL DEFAULT now(),
  elegida        boolean     NOT NULL DEFAULT false    -- salió en alguna edición: se guarda para siempre
);
CREATE INDEX IF NOT EXISTS tech_noticias_ultima_vez ON tech_noticias (ultima_vez);
CREATE INDEX IF NOT EXISTS tech_noticias_busqueda ON tech_noticias
  USING gin (to_tsvector('english', titulo || ' ' || coalesce(descripcion, '')));

CREATE TABLE IF NOT EXISTS tech_titulos (
  noticia_id bigint NOT NULL REFERENCES tech_noticias ON DELETE CASCADE,
  norm       text   NOT NULL,
  PRIMARY KEY (noticia_id, norm)
);
CREATE INDEX IF NOT EXISTS tech_titulos_trgm ON tech_titulos USING gin (norm gin_trgm_ops);

CREATE TABLE IF NOT EXISTS tech_links (
  link       text   PRIMARY KEY,                       -- normalizado por el parser (sin utm, sin www, sin / final)
  noticia_id bigint NOT NULL REFERENCES tech_noticias ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tech_corridas (
  id        text PRIMARY KEY,
  fecha     timestamptz NOT NULL DEFAULT now(),
  recibidas int, nuevas int, unidas int, fuera_de_cupo int, descartadas int, borradas int,
  fuentes   jsonb                                       -- {fuente: nuevas | "ERROR: …"}
);

-- Ediciones: las usaba el workflow viejo `Tech · Edición` (apagado). Hoy los resúmenes van a la tabla `resumenes`.
CREATE TABLE IF NOT EXISTS tech_ediciones (
  id         bigserial PRIMARY KEY,
  fecha      timestamptz NOT NULL DEFAULT now(),
  tipo       text NOT NULL,                             -- automatica / pedido
  desde      timestamptz,
  candidatas int,
  ids        bigint[] NOT NULL DEFAULT '{}',            -- en el orden en que se mandaron
  texto      text,
  datos      jsonb
);

-- Ingreso con CUPO por fuente: recorre cada fuente en orden (la más votada primero).
-- Lo que ya existe se actualiza y NO gasta cupo; lo nuevo entra hasta llenar el cupo de esa fuente.
-- Así cada día entran ~5 nuevas de HN, 5 de Lobsters y 5 de Reddit (2 + 2 + 1), aunque se repitan las de ayer.
CREATE OR REPLACE FUNCTION tech_ingresar(items jsonb, corrida text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  UMBRAL  constant real := 0.55;                       -- mismo hecho si el título se parece ≥ 55 %
  VENTANA constant interval := '72 hours';
  it jsonb; nid bigint; n text; v_fuente text; v_link text; usado int;
  cupos jsonb := '{}';
  c_nuevas int := 0; c_unidas int := 0; c_cupo int := 0; c_desc int := 0; c_borradas int := 0;
  por_fuente jsonb := '{}';
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(items) ORDER BY (value->>'fuente'), (value->>'posicion')::int LOOP
    n := f_norm(it->>'titulo'); v_link := it->>'link'; v_fuente := it->>'fuente';
    IF length(n) < 10 OR v_link IS NULL OR v_fuente IS NULL THEN c_desc := c_desc + 1; CONTINUE; END IF;
    IF NOT por_fuente ? v_fuente THEN por_fuente := por_fuente || jsonb_build_object(v_fuente, 0); END IF;

    SELECT noticia_id INTO nid FROM tech_links WHERE link = v_link;
    IF nid IS NULL THEN
      SELECT t.noticia_id INTO nid FROM tech_titulos t
      JOIN tech_noticias no ON no.id = t.noticia_id AND no.ultima_vez > now() - VENTANA
      WHERE t.norm % n AND similarity(t.norm, n) >= UMBRAL
      ORDER BY similarity(t.norm, n) DESC LIMIT 1;
    END IF;

    IF nid IS NULL THEN
      usado := coalesce((por_fuente->>v_fuente)::int, 0);
      IF usado >= coalesce((it->>'cupo')::int, 5) THEN c_cupo := c_cupo + 1; CONTINUE; END IF;
      INSERT INTO tech_noticias (titulo, descripcion, link, discusion, dominio, tags, puntos, comentarios, fuentes, origenes,
                                 mejor_posicion, ultima_corrida, publicada)
      VALUES (it->>'titulo', it->>'descripcion', v_link, it->>'discusion', it->>'dominio',
              coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(it->'tags') x), '{}'),
              (it->>'puntos')::int, (it->>'comentarios')::int, ARRAY[v_fuente],
              jsonb_build_array(jsonb_build_object('fuente', v_fuente, 'titulo', it->>'titulo', 'link', v_link,
                                'discusion', it->>'discusion', 'posicion', (it->>'posicion')::int, 'puntos', (it->>'puntos')::int)),
              (it->>'posicion')::int, corrida, (it->>'publicada')::timestamptz)
      RETURNING id INTO nid;
      por_fuente := jsonb_set(por_fuente, ARRAY[v_fuente], to_jsonb(usado + 1));
      c_nuevas := c_nuevas + 1;
    ELSE
      UPDATE tech_noticias no SET
        fuentes     = (SELECT array_agg(DISTINCT f) FROM unnest(no.fuentes || v_fuente) f),
        origenes    = CASE WHEN no.origenes @> jsonb_build_array(jsonb_build_object('fuente', v_fuente)) THEN no.origenes
                           ELSE no.origenes || jsonb_build_object('fuente', v_fuente, 'titulo', it->>'titulo', 'link', v_link,
                                'discusion', it->>'discusion', 'posicion', (it->>'posicion')::int, 'puntos', (it->>'puntos')::int) END,
        descripcion = coalesce(no.descripcion, it->>'descripcion'),
        discusion   = coalesce(no.discusion, it->>'discusion'),
        tags        = CASE WHEN cardinality(no.tags) = 0 THEN coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(it->'tags') x), '{}') ELSE no.tags END,
        puntos      = greatest(no.puntos, (it->>'puntos')::int),
        comentarios = greatest(no.comentarios, (it->>'comentarios')::int),
        mejor_posicion = least(no.mejor_posicion, (it->>'posicion')::int),
        corridas    = no.corridas + (no.ultima_corrida IS DISTINCT FROM corrida)::int,
        ultima_corrida = corrida,
        publicada   = least(no.publicada, (it->>'publicada')::timestamptz),
        ultima_vez  = now()
      WHERE no.id = nid;
      c_unidas := c_unidas + 1;
    END IF;

    INSERT INTO tech_links VALUES (v_link, nid) ON CONFLICT DO NOTHING;
    INSERT INTO tech_titulos VALUES (nid, n) ON CONFLICT DO NOTHING;
  END LOOP;

  DELETE FROM tech_noticias WHERE NOT elegida AND ultima_vez < now() - interval '30 days';
  GET DIAGNOSTICS c_borradas = ROW_COUNT;

  INSERT INTO tech_corridas (id, recibidas, nuevas, unidas, fuera_de_cupo, descartadas, borradas, fuentes)
  VALUES (corrida, jsonb_array_length(items), c_nuevas, c_unidas, c_cupo, c_desc, c_borradas, por_fuente)
  ON CONFLICT (id) DO UPDATE SET recibidas = EXCLUDED.recibidas, nuevas = tech_corridas.nuevas + EXCLUDED.nuevas,
    unidas = EXCLUDED.unidas, fuera_de_cupo = EXCLUDED.fuera_de_cupo, descartadas = EXCLUDED.descartadas,
    borradas = tech_corridas.borradas + EXCLUDED.borradas, fuentes = EXCLUDED.fuentes;

  RETURN jsonb_build_object('recibidas', jsonb_array_length(items), 'nuevas', c_nuevas, 'unidas', c_unidas,
                            'fuera_de_cupo', c_cupo, 'descartadas', c_desc, 'borradas', c_borradas, 'por_fuente', por_fuente);
END $$;

-- Refresco (2026-10-28): HN se captura con pocas horas de vida y después no se vuelve a ver.
-- El recolector vuelve a leer HN (72 h) y esto sube puntos y comentarios de lo ya guardado. No inserta.
-- Solo toca noticias que tienen esa fuente (it.fuente): si no, una de Lobsters o Reddit con el mismo link
-- recibiría puntos de HN y se mezclarían las escalas del percentil.
CREATE OR REPLACE FUNCTION tech_refrescar(items jsonb) RETURNS int
LANGUAGE sql AS $$
  WITH r AS (
    SELECT l.noticia_id, max((it->>'puntos')::int) AS p, max((it->>'comentarios')::int) AS c
    FROM jsonb_array_elements(items) it
    JOIN tech_links l ON l.link = it->>'link'
    JOIN tech_noticias t ON t.id = l.noticia_id AND (it->>'fuente') = ANY(t.fuentes)
    GROUP BY 1
  ), u AS (
    UPDATE tech_noticias n SET puntos = greatest(n.puntos, r.p), comentarios = greatest(n.comentarios, r.c)
    FROM r WHERE n.id = r.noticia_id
      AND (n.puntos IS DISTINCT FROM greatest(n.puntos, r.p) OR n.comentarios IS DISTINCT FROM greatest(n.comentarios, r.c))
    RETURNING 1
  )
  SELECT count(*)::int FROM u
$$;

-- Ranking sin IA. lugar (2026-10-28): percentil de los PUNTOS dentro de su fuente (30 días + elegidas), porque cada fuente
-- mide distinto. Tope por fuente: HN 5, Lobsters 4 (más técnica que noticiosa), Dev.to 4 (ya no se recolecta; quedan las
-- viejas hasta que venzan). Reddit (el RSS no trae puntos) sigue por puesto con tope 3.
-- CREATE OR REPLACE (no DROP): noticias_todas depende de esta vista; las columnas tienen que quedar iguales.
CREATE OR REPLACE VIEW tech_ranking AS
SELECT id, titulo, dominio, fuentes, puntos, comentarios, mejor_posicion, corridas, publicada, primera_vez, ultima_vez, elegida,
       lugar, varias, persistencia, antiguedad, round((lugar + varias + persistencia + antiguedad)::numeric, 2) AS puntaje
FROM (
  SELECT b.*,
         CASE b.medida
           WHEN 'hn'       THEN 5.0 * percent_rank() OVER (PARTITION BY b.medida ORDER BY b.puntos NULLS FIRST)
           WHEN 'lobsters' THEN 4.0 * percent_rank() OVER (PARTITION BY b.medida ORDER BY b.puntos NULLS FIRST)
           WHEN 'devto'    THEN 4.0 * percent_rank() OVER (PARTITION BY b.medida ORDER BY b.puntos NULLS FIRST)
           ELSE 3.5 - 0.5 * least(coalesce(b.mejor_posicion, 7), 7)
         END::numeric                                                           AS lugar,         -- reddit 1º: 3 · 2º: 2,5
         2.0 * (cardinality(b.fuentes) - 1)                                     AS varias,        -- en HN y Reddit a la vez
         0.5 * least(b.corridas - 1, 3)                                         AS persistencia,  -- sigue arriba al otro día
         -0.3 * extract(epoch FROM now() - coalesce(b.publicada, b.primera_vez)) / 86400 AS antiguedad
  FROM (
    SELECT n.id, n.titulo, n.dominio, n.fuentes, n.puntos, n.comentarios, n.mejor_posicion, n.corridas,
           n.publicada, n.primera_vez, n.ultima_vez, n.elegida,
           CASE WHEN 'hn' = ANY(n.fuentes) THEN 'hn' WHEN 'lobsters' = ANY(n.fuentes) THEN 'lobsters'
                WHEN 'devto' = ANY(n.fuentes) THEN 'devto' END AS medida
    FROM tech_noticias n
  ) b
) x;
