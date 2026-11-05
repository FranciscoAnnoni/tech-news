import { describe, expect, it } from "vitest";
import {
  elegirPosicion, guardarDonacion, leerDonacion, marcarVista, pilaVisible, planDonacion, posicionForzada, posicionPendiente,
  reducirDonacion, resolver, tocaHoy,
  type EstadoDonacion,
} from "./donacion";
import { diasEntre } from "./edicion";

function almacen() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe("diasEntre", () => {
  it("cuenta días de calendario, también entre meses", () => {
    expect(diasEntre("2026-11-02", "2026-11-05")).toBe(3);
    expect(diasEntre("2026-10-30", "2026-11-02")).toBe(3);
    expect(diasEntre("2026-11-05", "2026-11-02")).toBe(-3);
    expect(diasEntre("x", "2026-11-02")).toBeNull();
  });
});

describe("tocaHoy", () => {
  it("nunca el primer día que entra", () => {
    expect(tocaHoy({ primerDia: "2026-11-04" }, "2026-11-04")).toBe(false);
    expect(tocaHoy({ primerDia: "2026-11-04" }, "2026-11-05")).toBe(true);
  });

  it("una vez cada 3 días desde la última vez que la vio", () => {
    const visto = { primerDia: "2026-11-01", ultimaVista: "2026-11-04" };
    expect(tocaHoy(visto, "2026-11-05")).toBe(false);
    expect(tocaHoy(visto, "2026-11-06")).toBe(false);
    expect(tocaHoy(visto, "2026-11-07")).toBe(true);
  });

  it("después de apoyar, no vuelve por 30 días", () => {
    const dono = { primerDia: "2026-11-01", donoEl: "2026-11-04" };
    expect(tocaHoy(dono, "2026-12-03")).toBe(false);
    expect(tocaHoy(dono, "2026-12-04")).toBe(true);
  });
});

describe("elegirPosicion", () => {
  it("entre la 4ª y la 10ª noticia", () => {
    expect(elegirPosicion(15, 0)).toBe(4);
    expect(elegirPosicion(15, 0.999)).toBe(10);
    expect(elegirPosicion(15, 1)).toBe(10);
  });

  it("en un mazo corto nunca queda al final", () => {
    expect(elegirPosicion(6, 0.999)).toBe(5);
    expect(elegirPosicion(3, 0)).toBe(2);
    expect(elegirPosicion(1, 0)).toBeNull();
    expect(elegirPosicion(0, 0)).toBeNull();
  });
});

describe("planDonacion", () => {
  it("la primera visita no la muestra y recuerda el primer día", () => {
    const plan = planDonacion(null, "a,b", 15, "2026-11-04", 0);
    expect(plan).toEqual({ primerDia: "2026-11-04", edicion: { firma: "a,b", posicion: null, resuelta: false } });
  });

  it("si toca, elige la posición una vez por edición y una recarga no la cambia", () => {
    const plan = planDonacion({ primerDia: "2026-11-01" }, "a,b", 15, "2026-11-04", 0.5);
    expect(plan.edicion?.posicion).toBe(7);
    expect(planDonacion(plan, "a,b", 15, "2026-11-04", 0)).toBe(plan);
  });

  it("con otra edición vuelve a decidir", () => {
    const ayer: EstadoDonacion = { primerDia: "2026-11-01", ultimaVista: "2026-11-04", edicion: { firma: "a", posicion: 5, resuelta: true } };
    expect(planDonacion(ayer, "b", 15, "2026-11-05", 0).edicion).toEqual({ firma: "b", posicion: null, resuelta: false });
    expect(planDonacion(ayer, "c", 15, "2026-11-07", 0).edicion).toEqual({ firma: "c", posicion: 4, resuelta: false });
  });

  it("si no llegó a verla, al día siguiente vuelve a tocar", () => {
    const sinVer: EstadoDonacion = { primerDia: "2026-11-01", edicion: { firma: "a", posicion: 8, resuelta: false } };
    expect(planDonacion(sinVer, "b", 15, "2026-11-05", 0).edicion?.posicion).toBe(4);
  });
});

describe("resolver y marcarVista", () => {
  const base: EstadoDonacion = { primerDia: "2026-11-01", edicion: { firma: "a", posicion: 5, resuelta: false } };

  it("descartar la saca de esta edición sin pausa larga", () => {
    const fin = resolver(marcarVista(base, "2026-11-04"), false, "2026-11-04");
    expect(posicionPendiente(fin)).toBeNull();
    expect(fin.donoEl).toBeUndefined();
    expect(fin.ultimaVista).toBe("2026-11-04");
  });

  it("apoyar guarda el día para la pausa de 30", () => {
    expect(resolver(base, true, "2026-11-04").donoEl).toBe("2026-11-04");
  });

  it("pendiente mientras no se resuelva", () => {
    expect(posicionPendiente(base)).toBe(5);
    expect(posicionPendiente(null)).toBeNull();
  });
});

describe("pilaVisible", () => {
  it("mete la donación antes de la noticia elegida", () => {
    expect(pilaVisible(3, 15, 4, 3)).toEqual([
      { tipo: "noticia", indice: 3 },
      { tipo: "donacion" },
      { tipo: "noticia", indice: 4 },
    ]);
    expect(pilaVisible(4, 15, 4, 3)).toEqual([
      { tipo: "donacion" },
      { tipo: "noticia", indice: 4 },
      { tipo: "noticia", indice: 5 },
    ]);
  });

  it("sin donación pendiente, solo noticias", () => {
    expect(pilaVisible(13, 15, null, 3)).toEqual([{ tipo: "noticia", indice: 13 }, { tipo: "noticia", indice: 14 }]);
    expect(pilaVisible(15, 15, null, 3)).toEqual([]);
  });
});

describe("almacenamiento", () => {
  it("guarda y lee el estado", () => {
    const a = almacen();
    const estado: EstadoDonacion = { primerDia: "2026-11-01", ultimaVista: "2026-11-04", edicion: { firma: "a", posicion: null, resuelta: false } };
    guardarDonacion(a, estado);
    expect(leerDonacion(a)).toEqual(estado);
  });

  it.each(["no es json", "null", '{"primerDia":"ayer"}', "[]"])("ignora lo inválido: %s", (valor) => {
    const a = almacen();
    a.setItem("infomate:donacion", valor);
    expect(leerDonacion(a)).toBeNull();
  });

  it("descarta solo la parte rota", () => {
    const a = almacen();
    a.setItem("infomate:donacion", '{"primerDia":"2026-11-01","ultimaVista":3,"edicion":{"firma":"a","posicion":0,"resuelta":false}}');
    expect(leerDonacion(a)).toEqual({ primerDia: "2026-11-01" });
  });

  it("no rompe si el almacenamiento falla", () => {
    const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    expect(leerDonacion(roto)).toBeNull();
    expect(() => guardarDonacion(roto, { primerDia: "2026-11-01" })).not.toThrow();
  });
});

describe("posicionForzada", () => {
  it("sin el parámetro no fuerza", () => {
    expect(posicionForzada("", 15, 0)).toBeUndefined();
    expect(posicionForzada("?n=10", 15, 0)).toBeUndefined();
  });

  it("?donacion elige al azar y ?donacion=N la pone después de la noticia N", () => {
    expect(posicionForzada("?donacion", 15, 0)).toBe(4);
    expect(posicionForzada("?donacion=1", 15, 0)).toBe(1);
    expect(posicionForzada("?donacion=99", 15, 0)).toBe(14);
    expect(posicionForzada("?donacion=0", 15, 0)).toBe(4);
  });

  it("el reductor la muestra aunque hoy no toque", () => {
    const plan = reducirDonacion(null, { tipo: "planificar", previo: null, firma: "a", n: 15, hoy: "2026-11-04", azar: 0, forzada: 1 });
    expect(posicionPendiente(plan)).toBe(1);
  });
});
