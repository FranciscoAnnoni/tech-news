# Validación de la integración de analítica

## Alcance

Implementación de los tickets [#14](https://github.com/FranciscoAnnoni/tech-news/issues/14), [#15](https://github.com/FranciscoAnnoni/tech-news/issues/15), [#16](https://github.com/FranciscoAnnoni/tech-news/issues/16), [#17](https://github.com/FranciscoAnnoni/tech-news/issues/17), [#18](https://github.com/FranciscoAnnoni/tech-news/issues/18) y [#19](https://github.com/FranciscoAnnoni/tech-news/issues/19), según la spec [#13](https://github.com/FranciscoAnnoni/tech-news/issues/13).

## Checks locales

La base anterior a estos cambios pasó 118 tests, typecheck, lint y build. La integración pasa 139 tests en 14 archivos, `npm run typecheck`, `npm run lint` y `npm run build` desde `web/`. No se cambian el feed productivo ni los procesos de recolección y publicación.

Las pruebas agregadas verifican configuración por ambiente, buffer y captura por visita, modo por evento, allowlist de propiedades, desactivación segura por token ausente/host inválido/almacenamiento denegado/error del SDK, deduplicación y conteos del mazo, enlace marcado para compartir, resultados del prompt y confirmaciones tempranas de instalación, y saneamiento de URL/ruta de rendimiento.

## Prueba integrada

El procedimiento reproducible está en [.scratch/analitica-infomate/verification](../.scratch/analitica-infomate/verification/README.md). Usa una copia temporal del proyecto sin archivos `.env`, feed de tres tarjetas con fecha actual, token ficticio y un perfil temporal de Chrome. Las solicitudes a proveedores se interceptan y responden localmente.

Estado: ejecución integrada en curso; completar resultados antes de la entrega.

## Revisión

Revisión separada de convenciones y spec contra la base `9f13f335c7d1f6e6bd105f0321f08ce04e5528f9`. Se corrigió una clave compartida entre noticia disponible/no disponible que podía suprimir el evento al cambiar de estado. La protección para persistencia de búsquedas de Mixpanel se describe en [ADR 0002](adr/0002-mixpanel-referrer.md).

## Activación externa pendiente

Configurar el token público y región de Mixpanel en el ambiente de producción y habilitar Speed Insights en el proyecto existente de Vercel. La captura se activa con el siguiente despliegue del flujo habitual; no se creó ninguna cuenta, se contrató ningún plan ni se desplegó desde esta implementación.

La verificación de métricas en Vercel con tráfico real, la confirmación de instalación en dispositivos físicos y la observación de retención a siete días requieren esa activación y tiempo de uso. Las simulaciones de eventos de navegador no demuestran una instalación real, y las pruebas interceptadas no demuestran recepción en un proyecto productivo.
