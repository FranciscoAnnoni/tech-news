# Infomate

Lector diario de noticias en tarjetas (Next.js, PWA). El collector vive en la raíz del repo; esto es la app web.

- **Correr:** `npm install`, después `npm run dev`, o `npm run build && npm start`. Abre en <http://localhost:3000>.
- **Controles:** `npm test`, `npm run lint`, `npm run typecheck`.
- **Parámetro:** por defecto el mazo incluye todas las noticias disponibles, intercalando categorías. `?n=10` permite limitarlo a 10.
- **Datos:** `obtenerNoticias()` en `lib/noticias.ts` lee `hoy.json` de Vercel Blob cuando está definida `INFOMATE_STORE_ID`. Sin esa variable usa `datos/noticias.json`. La fuente es compartida por el mazo y las páginas públicas de noticias.
- **Instalar:** hace falta HTTPS (o localhost): por `http://IP` no hay service worker ni prompt de Android.
- **Íconos:** los de `public/iconos/` son el arte de Infomate.
- **URL pública:** `NEXT_PUBLIC_URL_PUBLICA` es la base de los links que se comparten (`{base}/noticia/{identificador}`). Es pública porque se lee en el cliente. Sin ella se usa `https://infomate.ar`; las barras finales se ignoran. En local, `NEXT_PUBLIC_URL_PUBLICA=http://localhost:3000` (ver `.env.example`). El helper es `urlPublica()` en `lib/urlPublica.ts`.

## Donaciones

El Mazo pide un aporte de $2.000 por Mercado Pago con una tarjeta amarilla que no cuenta como noticia. El link es `URL_MERCADO_PAGO` y el monto `MONTO_SUGERIDO` y la frecuencia está en `lib/donacion.ts` (cada 3 días, nunca el primer día del navegador, 30 días de pausa si tocó Apoyar).

Para no ver la tarjeta mientras desarrollan: 5 toques seguidos en el logo **INFOMATE** activan el modo equipo en ese navegador (otros 5 lo apagan). En iPhone, la app instalada guarda su almacenamiento aparte de Safari: hay que activarlo en las dos. Para probarla: `/?donacion` la fuerza en esa carga (también en modo equipo) en una posición al azar, y `/?donacion=1` la pone después de la primera noticia. Recordar que el Mazo solo se ve en anchos de teléfono.

## Noticias desde Vercel Blob

En `web/.env`, configurar `INFOMATE_STORE_ID` con el ID del store público (`store_...`). La app consulta siempre `https://<id sin store_, en minúsculas>.public.blob.vercel-storage.com/infomate/hoy.json`. Otro proceso publica y actualiza ese archivo en la carpeta `infomate/`, con nombre fijo y sin sufijo aleatorio. Reiniciar `npm run dev` después de cambiar las variables. Para producción, agregar la misma variable en el proyecto de Vercel y desplegar nuevamente.

El feed publicado es un arreglo de noticias con `id` UUID, categorías `arg`, `global` y `tech`, y fecha en `fecha_publicacion`. La lectura adapta categorías y fecha al modelo `Noticia` de `lib/tipos.ts`, conservando el UUID para los links compartidos. También se admite el formato local `{ "generado": "...", "noticias": [...] }` con IDs numéricos. Se valida la estructura al leerla; un error de red, HTTP o de formato se propaga, sin reemplazar las noticias reales por los ejemplos locales. Un arreglo vacío es válido.

La lectura ocurre en el servidor con `cache: "no-store"`, por lo que Next no guarda el feed entre requests. Vercel Blob tiene su propia caché CDN: al sobrescribir el JSON, la demora depende del `cacheControlMaxAge` configurado en la subida. Ver [caché de Vercel Blob](https://vercel.com/docs/vercel-blob).

Los links compartidos incluyen la edición: `/noticia/2026-11-02-tech-<uuid>`. Tanto la página como su preview leen `infomate/2026-11-02.json`, aunque `hoy.json` ya haya cambiado. El proceso publicador debe conservar los archivos diarios durante la vigencia de las noticias. Se mantienen los 7 días desde `fecha_publicacion`; un archivo diario ausente muestra la noticia como no disponible. Los links anteriores sin fecha siguen buscando en `hoy.json`.

La fecha de edición de `hoy.json` se toma de su cabecera `Last-Modified`, en hora de Buenos Aires; si falta, se usa el día actual en ese huso. El proceso publicador debe usar el mismo huso para nombrar los archivos diarios y publicar la copia fechada junto con `hoy.json`. La fecha de publicación de una nota puede ser anterior a la edición y no se usa para elegir el archivo.

`fecha_publicacion` admite ISO o `DD/MM/YYYY HH:mm` en hora argentina; este último se convierte a ISO con huso `-03:00` antes de calcular la vigencia.

Para leer un Blob público basta la URL. `INFOMATE_READ_WRITE_TOKEN` se reserva para el proceso que sube o actualiza las noticias; no se envía en esta lectura y nunca debe llevar el prefijo `NEXT_PUBLIC_`. Los archivos `.env` están ignorados por Git. Esta conexión consume un JSON ya publicado; no modifica el recolector ni sube archivos al store.

## Analítica

Mixpanel y Vercel Speed Insights se habilitan en Vercel Production. En desarrollo y preview están apagados salvo `NEXT_PUBLIC_ANALITICA_PRUEBA=true`; usar exclusivamente un proyecto Mixpanel de prueba con ese override. Configurar `NEXT_PUBLIC_MIXPANEL_TOKEN` con el token público del proyecto, nunca el API secret. `NEXT_PUBLIC_MIXPANEL_API_HOST` admite `https://api-js.mixpanel.com` (US, predeterminado), `https://api-eu.mixpanel.com` o `https://api-in.mixpanel.com`. Sin token o con host inválido se desactiva Mixpanel; Speed Insights es independiente y debe activarse en Vercel.

Para verificar, iniciar con el override y token de prueba, abrir la app y revisar las solicitudes de red: una entrada visible debe producir un `app_iniciada`, sin URL, query ni referrer. Probar también con almacenamiento o red bloqueados. La activación y la verificación con tráfico real requieren configurar los proyectos externos. Para recetas de retorno exacto en días calendario 1 y 7, con huso de Buenos Aires y cohortes maduras, consultar [reportes de analítica](../docs/reportes-analitica.md).
