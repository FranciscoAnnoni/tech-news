# ADR 0003: Mazo en teléfonos y Diario en el resto, en la misma ruta

Estado: aceptada.

La portada (`/`) renderiza en el servidor el Mazo y el Diario a partir de los mismos datos (`obtenerNoticias` + `tarjetasDelMazo`) y un media query de CSS decide cuál se ve. Los teléfonos (hasta 699px de ancho, o apaisados de hasta 500px de alto) ven el Mazo dentro del marco de 430px sin scroll; todo lo demás, tablets incluidas, ve el Diario con scroll normal. Elegimos CSS y no detección del dispositivo para que no haya salto ni diferencia entre servidor y cliente, y para que rotar o cambiar el tamaño de la ventana alcance.

La consulta vive en `CONSULTA_DIARIO` (`web/lib/portada.ts`); `globals.css` la repite literalmente y una prueba verifica que sean idénticas. Usa `not (… or …)` de Media Queries 4: un navegador que no la entienda ve el Mazo con el marco, que es el comportamiento previo. El cambio de marco se limita con `:has([data-portada="diario"])`, así la página pública de la noticia conserva el marco en cualquier pantalla.

El Mazo oculto sigue montado, pero con la misma consulta deja de registrar `mazo_iniciado` y `tarjeta_vista`: una tarjeta que nadie ve no es una Exposición de tarjeta. El Diario no mide aperturas ni salidas a la fuente; si se quiere medir, hay que sumar una superficie nueva al contrato de analítica.
