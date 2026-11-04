/**
 * Cuándo la portada muestra el Diario en vez del Mazo: todo lo que no es un teléfono (ni vertical de hasta
 * 699px de ancho ni apaisado de hasta 500px de alto). Tablets e iPads ven el Diario.
 *
 * Es la única fuente del corte: globals.css debe usar exactamente esta consulta (lo verifica portada.test.ts)
 * y el Mazo la usa para no medir tarjetas mientras está oculto. Si un navegador no entiende `not`/`or`
 * de Media Queries 4, la consulta no aplica y se ve el Mazo con el marco de celular, como antes.
 */
export const CONSULTA_DIARIO = "not ((max-width: 699px) or ((orientation: landscape) and (max-height: 500px)))";
