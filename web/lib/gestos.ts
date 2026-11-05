/** Distancia mínima para que un deslizamiento en el Detalle vuelva a las tarjetas. */
export const UMBRAL_VOLVER = 90;
/** Distancia hacia abajo para que soltar en el Mazo busque noticias. */
export const UMBRAL_RECARGA = 110;
/** Antes de esta distancia el gesto todavía no tiene dirección. */
const ZONA_MUERTA = 8;

export type Direccion = "horizontal" | "vertical" | null;

/** Igual criterio que las tarjetas: horizontal solo si domina con claridad. */
export function direccionDelGesto(dx: number, dy: number): Direccion {
  if (Math.hypot(dx, dy) < ZONA_MUERTA) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
}

/** En el Detalle, deslizar hacia la izquierda (largo, o corto y rápido) vuelve a las tarjetas. */
export function vuelveALasTarjetas(dx: number, velocidad: number): boolean {
  return dx <= -UMBRAL_VOLVER || (velocidad < -0.6 && dx < -40);
}

/** Cuánto baja el aviso: sigue al dedo con resistencia y se frena pasado el umbral. */
export function tironDeRecarga(dy: number): number {
  if (dy <= 0) return 0;
  return Math.min(dy * 0.6, UMBRAL_RECARGA);
}

/** En el Mazo, un tirón hacia abajo y mayormente vertical busca noticias. */
export function buscaNoticias(dx: number, dy: number): boolean {
  return dy >= UMBRAL_RECARGA && Math.abs(dx) < dy * 0.6;
}
