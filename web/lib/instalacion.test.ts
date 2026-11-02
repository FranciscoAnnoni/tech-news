import { afterEach, describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { CAPTURA_INSTALACION, pedirInstalacion, suscribirConfirmacionesInstalacion } from "./instalacion";

afterEach(() => vi.unstubAllGlobals());

function navegador() {
  const ventana = new EventTarget() as EventTarget & { __confirmacionesInstalacion?: number; __avisoInstalacion?: unknown };
  vi.stubGlobal("window", ventana);
  return ventana;
}

describe("instalación", () => {
  it("el listener temprano guarda appinstalled antes de hidratar", () => {
    const ventana = navegador();
    runInNewContext(CAPTURA_INSTALACION, {
      window: ventana, Event,
      addEventListener: ventana.addEventListener.bind(ventana),
      dispatchEvent: ventana.dispatchEvent.bind(ventana),
    });
    ventana.dispatchEvent(new Event("appinstalled"));
    const registrar = vi.fn();
    suscribirConfirmacionesInstalacion(registrar)();
    expect(registrar).toHaveBeenCalledOnce();
  });
  it("consume confirmaciones tempranas y posteriores una vez, sin inferir una instalación", () => {
    const ventana = navegador();
    const registrar = vi.fn();
    ventana.__confirmacionesInstalacion = 2;
    const cancelar = suscribirConfirmacionesInstalacion(registrar);
    expect(registrar).toHaveBeenCalledTimes(2);
    ventana.__confirmacionesInstalacion = 1;
    ventana.dispatchEvent(new Event("confirmacion-instalacion"));
    expect(registrar).toHaveBeenCalledTimes(3);
    cancelar();
    suscribirConfirmacionesInstalacion(registrar)();
    expect(registrar).toHaveBeenCalledTimes(3);
  });

  it.each([["accepted", "aceptada"], ["dismissed", "cancelada"]] as const)("normaliza %s", async (outcome, esperado) => {
    const ventana = navegador();
    const prompt = vi.fn().mockResolvedValue({ outcome });
    ventana.__avisoInstalacion = { prompt };
    const resultado = pedirInstalacion();
    expect(prompt).toHaveBeenCalledOnce();
    expect(await resultado).toBe(esperado);
  });

  it("maneja ausencia y rechazo del prompt", async () => {
    const ventana = navegador();
    expect(await pedirInstalacion()).toBeNull();
    ventana.__avisoInstalacion = { prompt: vi.fn().mockRejectedValue(new Error("privado")) };
    expect(await pedirInstalacion()).toBe("error");
  });

  it("usa userChoice cuando prompt no devuelve resultado", async () => {
    const ventana = navegador();
    ventana.__avisoInstalacion = { prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome: "accepted" }) };
    expect(await pedirInstalacion()).toBe("aceptada");
  });
});
