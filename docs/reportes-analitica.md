# Cómo leer la analítica de Infomate

La identidad de Mixpanel representa un navegador. Borrar almacenamiento, cambiar de dispositivo o pasar del navegador a la PWA puede fragmentarla; compartir navegador puede agrupar personas. Los bloqueadores y las fallas de red reducen la muestra observada.

Usar el proyecto productivo para reportes y un proyecto separado para pruebas. Configurar los reportes con huso `America/Argentina/Buenos_Aires` y mantener estable `version_esquema=1` al comparar períodos.

## Retorno a 1 y 7 días

Crear cohortes de primera visita observada con `app_iniciada`. Medir como retorno otra `app_iniciada` en el día calendario 1 o 7 posterior; excluir cohortes que aún no alcanzaron ese día. Es retorno en ese día, no cualquier retorno dentro de una ventana de siete días.

Para retorno con interacción, usar la misma cohorte de entrada y como evento de vuelta cualquiera de: `noticia_abierta`, `fuente_abierta` o `compartir_resultado` con resultado `compartido` o `copiado`. Cancelar o fallar al compartir no satisface esta última condición. La primera visita puede haber sido una página pública o una noticia no disponible; no limitar la cohorte a quienes empezaron el mazo.

## Interés por contenido

La unidad de comparación es el par único `recorrido_id + identificador`, no el visitante único ni la cantidad bruta de eventos.

- Denominador: pares con `tarjeta_vista`.
- Numerador: esos pares con `noticia_abierta` y `superficie=capa`.
- Agrupar por categoría, fuente y posición. Excluir aperturas `superficie=pagina`, ya que no requieren exposición en el mazo.

Volver a una tarjeta no genera exposición adicional; abrirla otra vez sí produce otra acción. Por eso un cociente entre conteos brutos de eventos puede superar 100 % y no es la tasa pedida. Usar agregación por par (mediante el análisis disponible o exportación), nunca dividir visitantes únicos de ambos eventos como sustituto.

Una apertura no prueba lectura completa, una salida a la fuente no prueba lectura externa y un descarte no es un voto negativo.

## Avance del mazo

Contar recorridos distintos con `mazo_iniciado` y `cantidad_tarjetas>0`. Comparar con recorridos que emitieron `mazo_completado`; además observar la distribución de tarjetas únicas expuestas por recorrido.

`abiertas` y `descartadas` en el completado reflejan la última resolución de cada tarjeta, igual que el texto final de la web. No son totales históricos de clics. Una persona puede terminar descartando todo. Reiniciar crea otro recorrido; un mazo vacío no cuenta como completado.

## Compartir y adquisición

Contar intentos distintos (`intento_id`) con `compartir_solicitado`, desglosar `compartir_resultado` por `compartido`, `copiado`, `cancelado` y `error`. Un cierre del documento o pérdida de red puede dejar un intento sin resultado observable.

Los enlaces enviados llevan `utm_source=share&utm_medium=referral`. Comparar visitas (`visita_id`) de `app_iniciada` con `origen_entrada=compartido` y la fracción de esas mismas visitas con interacción. El origen se mantiene al continuar desde la noticia pública al mazo.

El resultado nativo no prueba entrega; copiar no prueba envío. La marca puede conservarse al reenviar el enlace. No permite identificar quién lo compartió, quién lo recibió ni por qué aplicación circuló.

## Instalación y uso PWA

Observar `guia_instalacion_abierta`, desglosar `instalacion_resultado` por plataforma y resultado y contar `app_instalada` solo como confirmación del navegador. Aceptar el prompt no equivale a instalación completada; no tener prompt no equivale a cancelación.

Comparar recurrencia por `modo=navegador/pwa`, recordando que los modos pueden no compartir almacenamiento. En iOS se observa inicio en modo app, no el instante de instalación. Las diferencias de recurrencia entre modos son descriptivas, no demuestran causalidad.

## Rendimiento

Consultar Speed Insights por ruta agrupada: `/` y `/noticia/[identificador]`. Las URLs enviadas se depuran para quitar query, fragmento y segmentos arbitrarios. Las métricas y desgloses disponibles dependen del plan y del tráfico: no esperar un tablero poblado instantáneamente ni datos representativos de una prueba local.

La integración de código y las pruebas con solicitudes interceptadas no reemplazan la verificación posterior de activación con tráfico real en los proyectos de Mixpanel y Vercel.
