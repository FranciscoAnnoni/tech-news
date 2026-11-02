# Speed Insights

Speed Insights mide rendimiento real y es independiente de Mixpanel y su token. El layout habilita el componente en producción de Vercel; preview y desarrollo quedan deshabilitados salvo que `NEXT_PUBLIC_ANALITICA_PRUEBA=true`. Usar el override solo para verificación y retirarlo después. El filtro `beforeSend` conserva las métricas técnicas, elimina queries y fragmentos, agrupa toda ruta de noticia en `/noticia/[identificador]` y reemplaza otras rutas desconocidas por `/otra` tanto en URL como en route.

## Activación y verificación

1. En el proyecto existente de Vercel, abrir Speed Insights y activarlo. Vercel agrega las rutas del script y recopilación después del siguiente despliegue. No se crea un proyecto ni se despliega desde esta integración.
2. Para verificar un preview autorizado, definir `NEXT_PUBLIC_ANALITICA_PRUEBA=true` en ese ambiente y desplegarlo con el flujo habitual. La configuración de prueba de Mixpanel, si se usa, debe apuntar a un proyecto de prueba.
3. En las herramientas de red del navegador, comprobar una sola carga del script de Speed Insights y observar los envíos de métricas. Visitar `/` y una noticia con un email, UTM y fragmento de prueba en la URL; inspeccionar URL y route en los datos enviados para confirmar que solo aparecen `/` o `/noticia/[identificador]`, sin los valores de prueba. Algunas métricas se envían al abandonar la página. Navegar entre mazo y noticia y comprobar lectura y navegación también con el script o la red bloqueados.
4. En Speed Insights, seleccionar ambiente y período, elegir una métrica disponible y consultar el desglose por ruta para comparar `/` con `/noticia/[identificador]`. La disponibilidad de métricas y desgloses depende de la configuración y plan de Vercel; los datos necesitan tráfico real.

La activación y el envío en un despliegue real quedan pendientes hasta contar con acceso y tráfico autorizados; no se presupone que el panel tenga datos.

Para detener la captura, deshabilitar Speed Insights en el proyecto Vercel y publicar el cambio correspondiente por el flujo normal de release. Retirar también cualquier override de prueba. Consultar la [guía oficial](https://vercel.com/docs/speed-insights/quickstart) y la [configuración de beforeSend](https://vercel.com/docs/speed-insights/package).
