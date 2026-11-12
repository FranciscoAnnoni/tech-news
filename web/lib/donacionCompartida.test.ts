import { afterEach, describe, expect, it, vi } from "vitest";
import {
  despacharDonacion, leerEstadoDonacion, planificarDonacion, reiniciarDonacionCompartida, suscribirDonacion,
} from "./donacionCompartida";

function almacen() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v), datos };
}

afterEach(reiniciarDonacionCompartida);

describe("donación compartida entre el Mazo y el Diario", () => {
  const opciones = (a: ReturnType<typeof almacen>, azar: number) =>
    ({ almacen: a, busqueda: "?donacion", ahora: new Date("2026-11-12T15:00:00Z"), azar });

  it("planifica una sola vez por edición aunque lo pidan los dos", () => {
    const a = almacen();
    planificarDonacion("firma", 15, opciones(a, 0));
    const primero = leerEstadoDonacion();
    planificarDonacion("firma", 15, opciones(a, 0.99));
    expect(leerEstadoDonacion()).toBe(primero);
    expect(primero?.edicion).toEqual({ firma: "firma", posicion: 4, resuelta: false });
  });

  it("lo que resuelve uno lo ve el otro y queda guardado", () => {
    const a = almacen();
    const oyente = vi.fn();
    const desuscribir = suscribirDonacion(oyente);
    planificarDonacion("firma", 15, opciones(a, 0));
    despacharDonacion({ tipo: "resolver", apoyo: false, hoy: "2026-11-12" }, a);
    expect(leerEstadoDonacion()?.edicion?.resuelta).toBe(true);
    expect(JSON.parse(a.datos.get("infomate:donacion") ?? "{}").edicion.resuelta).toBe(true);
    expect(oyente).toHaveBeenCalledTimes(2);
    desuscribir();
  });
});
