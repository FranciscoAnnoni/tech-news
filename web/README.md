# Infomate

Lector diario de noticias en tarjetas (Next.js, PWA). El collector vive en la raíz del repo; esto es la app web.

- **Correr:** `npm install`, después `npm run dev`, o `npm run build && npm start`. Abre en <http://localhost:3000>.
- **Controles:** `npm test`, `npm run lint`, `npm run typecheck`.
- **Parámetro:** `?n=15` cambia el largo del mazo (por defecto 10, intercalando categorías).
- **Datos:** salen de `datos/noticias.json`, leídos solo por `obtenerNoticias()` en `lib/noticias.ts`. Una API futura reemplaza esa función.
- **Instalar:** hace falta HTTPS (o localhost): por `http://IP` no hay service worker ni prompt de Android.
- **Íconos:** los de `public/iconos/` son de relleno.
- **URL pública:** `NEXT_PUBLIC_URL_PUBLICA` es la base de los links que se comparten (`{base}/noticia/{identificador}`). Es pública porque se lee en el cliente. Sin ella se usa `https://infomate.ar`; las barras finales se ignoran. En local, `NEXT_PUBLIC_URL_PUBLICA=http://localhost:3000` (ver `.env.example`). El helper es `urlPublica()` en `lib/urlPublica.ts`.
