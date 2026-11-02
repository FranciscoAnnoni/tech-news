# ADR 0002: Evitar persistencia de búsquedas en Mixpanel

Estado: aceptada.

Mixpanel Browser 2.84.0 ejecuta `persistence.update_search_keyword(document.referrer)` durante la inicialización y al registrar eventos, incluso con `save_referrer`, `store_google` y `track_marketing` desactivados. Esto puede guardar términos de búsqueda, contrariamente al contrato de datos de Infomate. El hook `before_send_events` filtra el envío, pero no evita la persistencia previa.

Fijamos la dependencia en 2.84.0. En el callback `loaded`, que esa versión ejecuta antes de sus propiedades predeterminadas, sustituimos `update_search_keyword` por una función vacía y eliminamos propiedades de atribución anteriores. Si el método no existe, se aborta la inicialización de Mixpanel para fallar de forma segura. La lectura de la aplicación no depende del proveedor.

Al actualizar el SDK, verificar su orden de inicialización y revisar en un navegador tanto el almacenamiento como las solicitudes salientes con un referrer de búsqueda, query y fragmento de prueba. Adaptar o retirar esta protección solo si la versión nueva ofrece una opción que impida esa persistencia. Mantener la prueba del contrato y la lista de propiedades permitidas en el transporte.
