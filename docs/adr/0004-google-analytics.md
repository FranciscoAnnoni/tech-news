# ADR 0004: Google Analytics para adquisición, junto a Mixpanel

Estado: aceptada el 2026-11-12.

Infomate sale al público con un short y publicidad. Hace falta saber de dónde llega la gente (redes, búsquedas, campañas) y cuántos lectores hay por día con los reportes estándar de Google, que también se necesitan si después se pauta con Google.

Sumamos Google Analytics 4 con `@next/third-parties` en el layout raíz, solo cuando la analítica está habilitada (producción o `NEXT_PUBLIC_ANALITICA_PRUEBA`) y `NEXT_PUBLIC_GA_ID` tiene un ID válido (`G-…`). Mide las vistas de página con la medición mejorada de GA4; no le mandamos eventos propios. Mixpanel sigue siendo la fuente de los eventos de producto (mazo, aperturas, retorno) y no cambia.

Consecuencias: GA guarda el referrer y los parámetros `utm_*`, incluidos los términos de búsqueda que lleguen, que es justo lo que ADR 0002 evita en Mixpanel. Lo aceptamos por pedido explícito: en GA es el dato que se quiere. Como el detalle del Mazo se abre sin cambiar la URL, GA ve la portada y las páginas `/noticia/…`, no cada tarjeta. GA usa cookies propias; seguimos sin banner, como en ADR 0001, y eso es una decisión de producto, no una conclusión legal.
