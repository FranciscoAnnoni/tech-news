import type { Categoria } from "./tipos";
import type { Plataforma } from "./plataforma";

export type Pantalla = "mazo" | "noticia" | "no_disponible";
export type ContextoNoticia = { identificador: string; categoria: Categoria; fuente: string; edicion?: string };
export type ContextoMazo = ContextoNoticia & { recorrido_id: string; posicion: number; cantidad_tarjetas: number };
/** `posicion`: cuántas noticias van antes de la tarjeta de donación. */
type ContextoDonacion = { recorrido_id: string; posicion: number; cantidad_tarjetas: number };
type Superficie = "tarjeta" | "capa" | "pagina";
type Accion = ContextoNoticia & { superficie: Superficie; recorrido_id?: string; posicion?: number; cantidad_tarjetas?: number };
type Eventos = {
  app_iniciada: { pantalla_entrada: Pantalla };
  mazo_iniciado: { recorrido_id: string; cantidad_tarjetas: number };
  tarjeta_vista: ContextoMazo;
  noticia_abierta: Accion;
  noticia_descartada: ContextoMazo & { superficie: "tarjeta" };
  fuente_abierta: Accion;
  compartir_solicitado: Accion & { intento_id: string };
  compartir_resultado: Accion & { intento_id: string; resultado: "compartido" | "copiado" | "cancelado" | "error" };
  mazo_completado: { recorrido_id: string; cantidad_tarjetas: number; abiertas: number; descartadas: number };
  guia_instalacion_abierta: { plataforma: Plataforma };
  instalacion_resultado: { plataforma: Plataforma; resultado: "aceptada" | "cancelada" | "error" };
  app_instalada: Record<string, never>;
  noticia_no_disponible_vista: Record<string, never>;
  donacion_vista: ContextoDonacion;
  donacion_descartada: ContextoDonacion;
  donacion_abierta: ContextoDonacion & { superficie: "tarjeta" };
};
type Evento = { [K in keyof Eventos]: { nombre: K; propiedades: Eventos[K]; modo: "navegador" | "pwa" } }[keyof Eventos];
type Cliente = { track: (nombre: string, propiedades: Record<string, unknown>) => void };
let cliente: Cliente | undefined;
let estado: "espera" | "iniciando" | "listo" | "apagado" = "espera";
let cola: Evento[] = [];
let visita = "";
let origen: "compartido" | "sin_marca" = "sin_marca";
let inicio = false;
let pantalla: Pantalla | undefined;
const MAX_COLA = 100;

export function crearId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}
function modoActual(): "navegador" | "pwa" {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone ? "pwa" : "navegador"; } catch { return "navegador"; }
}
function enviar(evento: Evento) {
  try { cliente?.track(evento.nombre, { ...evento.propiedades, version_esquema: 1, visita_id: visita, modo: evento.modo, origen_entrada: origen }); } catch { /* La lectura nunca depende del proveedor. */ }
}
export function registrarEvento<K extends keyof Eventos>(nombre: K, propiedades: Eventos[K]): void {
  const evento = { nombre, propiedades, modo: modoActual() } as Evento;
  if (estado === "listo") enviar(evento);
  else if (estado !== "apagado") {
    if (nombre === "app_iniciada") { if (cola.length === MAX_COLA) cola.pop(); cola.unshift(evento); }
    else if (cola.length < MAX_COLA) cola.push(evento);
  }
}
export function marcarPantalla(valor: Pantalla): void {
  pantalla = valor;
  iniciarVisitaVisible();
}
function iniciarVisitaVisible() {
  if (inicio || !pantalla || typeof document === "undefined" || document.visibilityState !== "visible") return;
  inicio = true;
  registrarEvento("app_iniciada", { pantalla_entrada: pantalla });
}
export function iniciarAnalitica(habilitada: boolean): void {
  if (estado !== "espera" || typeof window === "undefined") return;
  if (!habilitada) { estado = "apagado"; cola = []; return; }
  visita = crearId();
  const params = new URLSearchParams(window.location.search);
  origen = params.get("utm_source") === "share" && params.get("utm_medium") === "referral" ? "compartido" : "sin_marca";
  document.addEventListener("visibilitychange", iniciarVisitaVisible);
  iniciarVisitaVisible();
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  const host = process.env.NEXT_PUBLIC_MIXPANEL_API_HOST || "https://api-js.mixpanel.com";
  if (!token) { estado = "apagado"; cola = []; return; }
  if (!["https://api-js.mixpanel.com", "https://api-eu.mixpanel.com", "https://api-in.mixpanel.com"].includes(host)) {
    if (process.env.NODE_ENV !== "production") console.warn("Analítica deshabilitada: endpoint de Mixpanel inválido.");
    estado = "apagado"; cola = []; return;
  }
  try {
    const prueba = "__infomate_analitica_prueba__";
    localStorage.setItem(prueba, prueba); localStorage.removeItem(prueba);
  } catch { estado = "apagado"; cola = []; return; }
  estado = "iniciando";
  void import("mixpanel-browser").then(({ default: mixpanel }) => {
    if (estado !== "iniciando") return;
    mixpanel.init(token, {
      api_host: host, persistence: "localStorage", autocapture: false, record_sessions_percent: 0,
      // El SDK 2.84 persiste palabras de búsqueda incluso con save_referrer=false.
      // Su callback loaded corre antes de _set_default_superprops; fallar cerrado si cambia esa estructura.
      loaded: (instancia) => {
        if (!("persistence" in instancia) || typeof instancia.persistence !== "object" || !instancia.persistence
          || !("update_search_keyword" in instancia.persistence) || typeof instancia.persistence.update_search_keyword !== "function") {
          throw new Error("SDK de analítica incompatible");
        }
        instancia.persistence.update_search_keyword = () => {};
        for (const propiedad of ["mp_keyword", "$search_engine", "$initial_referrer", "$initial_referring_domain", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) instancia.unregister(propiedad);
      },
      track_pageview: false, ...{ track_marketing: false, skip_first_touch_marketing: true }, store_google: false, save_referrer: false, stop_utm_persistence: true, ip: false, batch_requests: false,
      hooks: { before_send_events: (payload) => {
        const permitidas = new Set(["token", "distinct_id", "$device_id", "$insert_id", "time", "mp_lib", "$lib_version", "version_esquema", "visita_id", "modo", "origen_entrada", "pantalla_entrada", "identificador", "categoria", "fuente", "edicion", "recorrido_id", "posicion", "cantidad_tarjetas", "superficie", "intento_id", "resultado", "abiertas", "descartadas", "plataforma"]);
        payload.properties = Object.fromEntries(Object.entries(payload.properties).filter(([clave]) => permitidas.has(clave)));
        return payload;
      } },
      property_blacklist: ["$current_url", "$referrer", "$referring_domain", "$initial_referrer", "$initial_referring_domain", "$search_engine", "mp_keyword"],
    });
    cliente = mixpanel;
    estado = "listo";
    const pendientes = cola; cola = [];
    pendientes.forEach(enviar);
  }).catch(() => { estado = "apagado"; cola = []; });
}
