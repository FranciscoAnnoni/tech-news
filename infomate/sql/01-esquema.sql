-- Infomate: esquema de la base `infomate` (Postgres 17).
-- Una tabla `noticias` particionada por categoría: las particiones `global`, `arg` y `tech`
-- son las tablas por categoría, y se consultan todas juntas desde `noticias`.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE categoria AS ENUM ('global', 'arg', 'tech');

CREATE TABLE noticias (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),  -- id para compartir
  categoria          categoria   NOT NULL,
  titulo_original    text        NOT NULL,                            -- como lo publicó el medio
  titulo             text,                                            -- traducido por el juez
  descripcion_fuente text,                                            -- copete que trae el feed
  resumen            text        CHECK (char_length(resumen) <= 1000),  -- del juez: se le piden 450; 1000 es solo la red
  contenido          text        CHECK (char_length(contenido) <= 2000),-- primeros 2000 caracteres, idioma original
  link               text        NOT NULL,                            -- directo al medio, nunca Google News
  link_google        text,                                            -- el de Google News, si vino de ahí
  fuente             text        NOT NULL,                            -- medio (BBC Mundo) o agregador (HN)
  medios             text[]      NOT NULL DEFAULT '{}',               -- todos los medios que la cubrieron
  fecha_publicacion  timestamptz,                                     -- la que trae la fuente
  posicion           int,                                             -- mejor puesto en su feed
  puntos             int,                                             -- votos (tech)
  comentarios        int,                                             -- comentarios (tech)
  portada            boolean     NOT NULL DEFAULT false,              -- estuvo en una portada de Google News
  puntaje_previo     real,                                            -- preselección sin IA
  candidata          boolean     NOT NULL DEFAULT false,              -- pasó al juez
  puntaje            smallint    CHECK (puntaje BETWEEN 0 AND 100),   -- del juez
  motivo             text,                                            -- del juez, una línea
  juzgada            timestamptz,
  primera_vez        timestamptz NOT NULL DEFAULT now(),
  ultima_vez         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, categoria),
  UNIQUE (link, categoria)
) PARTITION BY LIST (categoria);

CREATE TABLE global PARTITION OF noticias FOR VALUES IN ('global');
CREATE TABLE arg    PARTITION OF noticias FOR VALUES IN ('arg');
CREATE TABLE tech   PARTITION OF noticias FOR VALUES IN ('tech');

CREATE INDEX noticias_ultima_vez ON noticias (categoria, ultima_vez DESC);
CREATE INDEX noticias_titulo_trgm ON noticias USING gin (lower(titulo_original) gin_trgm_ops);

-- Las 5 elegidas por categoría de cada día. No se borra nunca.
CREATE TABLE diaria (
  fecha      date      NOT NULL,                                     -- día de la edición (hora Argentina)
  categoria  categoria NOT NULL,
  orden      smallint  NOT NULL CHECK (orden BETWEEN 1 AND 5),       -- 1 = mayor puntaje de su categoría
  noticia_id uuid      NOT NULL,
  PRIMARY KEY (fecha, categoria, orden),
  UNIQUE (fecha, noticia_id),
  FOREIGN KEY (noticia_id, categoria) REFERENCES noticias (id, categoria)
);

-- Una fila por corrida, para ver qué pasó cada día.
CREATE TABLE corridas (
  id     text        PRIMARY KEY,                                    -- id de la ejecución de n8n
  inicio timestamptz NOT NULL DEFAULT now(),
  fin    timestamptz,
  estado text        NOT NULL DEFAULT 'corriendo',                   -- corriendo / ok / error
  datos  jsonb       NOT NULL DEFAULT '{}'                           -- conteos por fuente y por categoría
);

-- Cada noticia de la edición en el formato de la app.
CREATE VIEW diaria_json AS
SELECT d.fecha, d.categoria, d.orden, n.puntaje,
       jsonb_build_object(
         'id', n.id,
         'titulo', n.titulo,
         'titulo_original', n.titulo_original,
         'descripcion', n.resumen,
         'contenido', n.contenido,
         'categoria', n.categoria,
         'link', n.link,
         'fuente', n.fuente,
         'fecha_publicacion', to_char(n.fecha_publicacion AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
         'puntaje', n.puntaje) AS noticia
FROM diaria d
JOIN noticias n ON n.id = d.noticia_id AND n.categoria = d.categoria;

-- La edición de un día como un array JSON, de mayor a menor puntaje.
CREATE FUNCTION edicion(dia date) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_agg(noticia ORDER BY puntaje DESC, categoria, orden), '[]'::jsonb)
  FROM diaria_json WHERE fecha = dia
$$;
