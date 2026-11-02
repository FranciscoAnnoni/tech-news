import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const proveedor = vi.hoisted(() => ({ init: vi.fn(), track: vi.fn() }));
vi.mock("mixpanel-browser", () => ({ default: proveedor }));
let visible: string;
let standalone: boolean;
let alVisibilizar: (() => void) | undefined;
const almacenamiento = { setItem: vi.fn(), removeItem: vi.fn() };
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "token-prueba");
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_API_HOST", "");
  visible = "visible"; standalone = false; alVisibilizar = undefined;
  vi.stubGlobal("window", { location: { search: "?utm_source=share&utm_medium=referral&email=privado#fragmento" }, matchMedia: () => ({ matches: standalone }) });
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("document", { get visibilityState() { return visible; }, addEventListener: (_: string, listener: () => void) => { alVisibilizar = listener; } });
  vi.stubGlobal("localStorage", almacenamiento);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function completarCarga() { await vi.waitFor(() => expect(proveedor.init).toHaveBeenCalled()); }

describe("adaptador de analítica", () => {
  it("conserva el buffer, emite un inicio visible y mantiene origen sin copiar la query", async () => {
    const api = await import("./analitica");
    visible = "hidden";
    api.registrarEvento("app_instalada", {}); api.marcarPantalla("noticia"); api.iniciarAnalitica(true);
    await completarCarga();
    expect(proveedor.track).toHaveBeenCalledTimes(1);
    visible = "visible"; alVisibilizar?.(); alVisibilizar?.(); api.marcarPantalla("mazo");
    expect(proveedor.track).toHaveBeenCalledTimes(2);
    expect(proveedor.track).toHaveBeenLastCalledWith("app_iniciada", expect.objectContaining({ pantalla_entrada: "noticia", origen_entrada: "compartido", modo: "navegador" }));
    expect(JSON.stringify(proveedor.track.mock.calls)).not.toContain("privado");
    standalone = true; api.registrarEvento("app_instalada", {});
    expect(proveedor.track).toHaveBeenLastCalledWith("app_instalada", expect.objectContaining({ modo: "pwa" }));
  });
  it("filtra propiedades automáticas y desactiva captura y atribución del proveedor", async () => {
    const api = await import("./analitica"); api.iniciarAnalitica(true); await completarCarga();
    const config = proveedor.init.mock.calls[0][1];
    expect(config).toMatchObject({ autocapture: false, track_pageview: false, track_marketing: false, skip_first_touch_marketing: true, store_google: false, save_referrer: false, ip: false, batch_requests: false });
    const actualizarBusqueda = vi.fn();
    const instancia = { persistence: { update_search_keyword: actualizarBusqueda }, unregister: vi.fn() };
    config.loaded(instancia);
    instancia.persistence.update_search_keyword("https://google.com/?q=privado");
    expect(actualizarBusqueda).not.toHaveBeenCalled();
    expect(instancia.unregister).toHaveBeenCalledWith("mp_keyword");
    expect(() => config.loaded({})).toThrow();
    const limpio = config.hooks.before_send_events({ event: "app_iniciada", properties: { token: "token-prueba", distinct_id: "id", visita_id: "visita", $current_url: "https://ejemplo/?email=privado", utm_campaign: "privado" } });
    expect(limpio.properties).toEqual({ token: "token-prueba", distinct_id: "id", visita_id: "visita" });
  });
  it.each(["deshabilitada", "token", "host", "almacenamiento", "sdk"])("contiene fallas: %s", async (fallo) => {
    const advertencia = vi.spyOn(console, "warn").mockImplementation(() => {});
    if (fallo === "token") vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    if (fallo === "host") vi.stubEnv("NEXT_PUBLIC_MIXPANEL_API_HOST", "https://invalido.example");
    if (fallo === "almacenamiento") almacenamiento.setItem.mockImplementationOnce(() => { throw Error("denegado"); });
    if (fallo === "sdk") proveedor.init.mockImplementationOnce(() => { throw Error("falló"); });
    const api = await import("./analitica");
    expect(() => { api.marcarPantalla("mazo"); api.iniciarAnalitica(fallo !== "deshabilitada"); api.registrarEvento("app_instalada", {}); }).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(proveedor.track).not.toHaveBeenCalled();
    if (fallo === "host") expect(advertencia).toHaveBeenCalledWith("Analítica deshabilitada: endpoint de Mixpanel inválido.");
    else expect(advertencia).not.toHaveBeenCalled();
    advertencia.mockRestore();
  });
});
