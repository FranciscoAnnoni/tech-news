/** Distancia mínima para que arrastrar desde el borde en el Detalle vuelva a las tarjetas. */
export const UMBRAL_VOLVER = 90;

/** Ancho de la franja del borde izquierdo donde tiene que apoyarse el dedo para volver, como en iOS. */
export const BORDE_VOLVER = 32;

export function empiezaEnElBorde(x: number, izquierda: number): boolean {
  return x - izquierda <= BORDE_VOLVER;
}

/** Desde el borde no hace falta ir derecho: alcanza con que avance hacia la derecha más que la mitad de lo que sube o baja. */
export function esTironDesdeElBorde(dx: number, dy: number): boolean {
  return dx > 0 && dx >= Math.abs(dy) * 0.5;
}

/** Arrastrar desde el borde hacia la derecha (largo, o corto y rápido) vuelve a las tarjetas. */
export function vuelveALasTarjetas(dx: number, velocidad: number): boolean {
  return dx >= UMBRAL_VOLVER || (velocidad > 0.5 && dx > 40);
}
