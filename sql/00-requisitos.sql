-- Requisitos de 01-esquema.sql. Idempotente.
-- pg_trgm: parecido de títulos (operador %, similarity). unaccent: f_norm saca acentos.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Título normalizado para comparar: minúsculas, sin acentos, solo letras, números y espacios.
CREATE OR REPLACE FUNCTION f_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(public.unaccent('public.unaccent'::regdictionary, coalesce(t,''))),
         '[^a-z0-9ñ ]', ' ', 'g'), '\s+', ' ', 'g'))
$$;
