# Medir recurrencia por navegador con eventos explícitos

## Estado

Aceptado el 2026-11-02. Las reglas de actividad, exposición y privacidad se registran en `docs/analitica.md`.

## Contexto

Infomate quiere entender si sus lectores vuelven y qué contenido les interesa. El detalle del mazo se abre sin cambiar la URL y el flujo actual no requiere cuentas.

## Decisión

Usar Mixpanel con identidad seudónima por navegador y eventos explícitos encapsulados en un módulo tipado de cliente. Mantener autocapture y grabaciones de sesiones desactivados inicialmente. Complementar con Vercel Speed Insights; Sentry queda fuera del alcance actual.

Por instrucción explícita del usuario, medir sin banner ni preferencia de analítica. No recoger nombres, emails ni contenido completo de noticias. El identificador de navegador y las propiedades de eventos siguen siendo datos de medición.

## Consecuencias

Los eventos representarán acciones del producto que una vista de página no distingue. La retención será una estimación por navegador: borrar almacenamiento o cambiar de dispositivo puede fragmentar un lector; compartir navegador puede agrupar personas. La decisión de no mostrar una preferencia describe el producto y no constituye una conclusión legal. Los nombres y significados de eventos deben mantenerse estables para preservar comparaciones históricas.
