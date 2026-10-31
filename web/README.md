# Infomate

Lector diario de noticias en tarjetas (Next.js, PWA). El collector vive en la raíz del repo; esto es la app web.

- **Correr:** `npm install`, después `npm run dev`, o `npm run build && npm start`. Abre en <http://localhost:3000>.
- **Controles:** `npm test`, `npm run lint`, `npm run typecheck`.
- **Parámetro:** `?n=15` cambia el largo del mazo (por defecto 10, intercalando categorías).
- **Datos:** salen de `datos/noticias.json`, leídos solo por `obtenerNoticias()` en `lib/noticias.ts`. Una API futura reemplaza esa función.
- **Instalar:** hace falta HTTPS (o localhost): por `http://IP` no hay service worker ni prompt de Android.
- **Íconos:** los de `public/iconos/` son de relleno.
