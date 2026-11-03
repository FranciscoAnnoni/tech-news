# Lectura de instalación y uso PWA

Para observar interés, comparar `guia_instalacion_abierta` por plataforma con los intentos nativos que producen `instalacion_resultado`, agrupados por `resultado` (aceptada, cancelada o error). El prompt nativo no está disponible en todas las plataformas: abrir la guía sin prompt no equivale a una cancelación. Una aceptación del prompt y una confirmación `app_instalada` son observaciones distintas; la confirmación solo aparece cuando el navegador emite `appinstalled`, incluso si ocurre antes de la hidratación.

Para uso y recurrencia, comparar visitas y retornos observados por `modo` navegador o PWA, usando las mismas ventanas y zona horaria de los reportes de retorno. No inferir la fecha de instalación en iOS, ni unir automáticamente el navegador con la app instalada. Las diferencias entre modos son descriptivas y no prueban que instalar haya causado cambios en la retención. Los pasos de la guía, resultados del prompt y confirmaciones no forman un funnel universal entre plataformas.

La verificación real de instalación depende de un dispositivo y navegador compatibles. Simular eventos comprueba la instrumentación pero no demuestra una instalación real.
