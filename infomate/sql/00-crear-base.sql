-- Infomate: crea el rol y la base. Se corre como superusuario, pasando la contraseña:
--   psql -v pass="$INFOMATE_PG_PASS" -f 00-crear-base.sql
-- La contraseña no se commitea.
\set ON_ERROR_STOP 1
CREATE ROLE infomate LOGIN PASSWORD :'pass';
CREATE DATABASE infomate OWNER infomate;
REVOKE ALL ON DATABASE infomate FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE infomate TO infomate;
