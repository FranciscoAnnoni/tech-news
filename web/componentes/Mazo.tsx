"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { crearId, registrarEvento } from "@/lib/analitica";
import {
  guardarDonacion, leerDonacion, pilaVisible, posicionPendiente, reducirDonacion, URL_MATECITO,
} from "@/lib/donacion";
import { diaDeBuenosAires } from "@/lib/edicion";
import { conteosFinales, contextoMazo, crearMedicionMazo } from "@/lib/medicionMazo";
import { estaInstalada, suscribirInstalacion } from "@/lib/instalacion";
import { ESTADO_INICIAL, reducirMazo, textoFin } from "@/lib/mazo";
import { CONSULTA_DIARIO } from "@/lib/portada";
import { firmaDelMazo, guardarProgreso, leerProgreso } from "@/lib/progreso";
import type { TarjetaNoticia } from "@/lib/tipos";
import { BotonCompartir } from "./BotonCompartir";
import { Detalle } from "./Detalle";
import { Guia } from "./Guia";
import { Tarjeta } from "./Tarjeta";
import { TarjetaDonacion } from "./TarjetaDonacion";
import estilosDetalle from "./Detalle.module.css";
import estilos from "./Mazo.module.css";

type Capa = { tipo: "detalle"; indice: number } | { tipo: "guia" } | null;

const PROFUNDIDAD = 3;

// Se conserva ante el montaje de comprobación de Strict Mode. Al salir realmente
// de la ruta se libera; no persiste el progreso ni sobrevive una recarga.
let medicionActual: ReturnType<typeof crearMedicionMazo> | undefined;
let liberacion: ReturnType<typeof setTimeout> | undefined;
function obtenerMedicion() {
  if (liberacion) clearTimeout(liberacion);
  if (!medicionActual) medicionActual = crearMedicionMazo(crearId());
  return medicionActual;
}
function suscribirVisibilidad(avisar: () => void) {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
}
const documentoVisible = () => document.visibilityState === "visible";

// Fuera de los teléfonos la portada muestra el Diario y el Mazo queda oculto por CSS: no debe medir
// tarjetas que nadie ve. Misma consulta que globals.css.
function suscribirDiario(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DIARIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
const seVeElDiario = () => window.matchMedia(CONSULTA_DIARIO).matches;


export function Mazo({ tarjetas }: { tarjetas: TarjetaNoticia[] }) {
  const [estado, despachar] = useReducer(reducirMazo, ESTADO_INICIAL);
  const [capa, setCapa] = useState<Capa>(null);
  const [enTransicion, setEnTransicion] = useState(false);
  // Solo en el cliente: depende del localStorage y del azar. El servidor pinta el mazo sin donación.
  const [donacion, despacharDonacion] = useReducer(reducirDonacion, null);
  const botonDescargar = useRef<HTMLButtonElement>(null);
  const aperturaRegistrada = useRef<Capa>(null);
  const documentoALaVista = useSyncExternalStore(suscribirVisibilidad, documentoVisible, () => false);
  const oculto = useSyncExternalStore(suscribirDiario, seVeElDiario, () => true);
  const visible = documentoALaVista && !oculto;
  // Oculto hasta hidratar: una app ya instalada nunca muestra el botón.
  const instalada = useSyncExternalStore(suscribirInstalacion, estaInstalada, () => true);

  const n = tarjetas.length;
  const { indice } = estado;
  const firma = firmaDelMazo(tarjetas.map((t) => t.id));

  // Layout effect: restaura antes de pintar, así no se ve la primera tarjeta y luego el salto a donde quedó.
  useLayoutEffect(() => {
    const guardado = leerProgreso(localStorage, firma, n);
    if (guardado) despachar({ tipo: "restaurar", estado: guardado });
  }, [firma, n]);

  // Si llegó otra edición, la primera escritura pisa el progreso viejo.
  useEffect(() => guardarProgreso(localStorage, firma, estado), [firma, estado]);

  useLayoutEffect(() => {
    despacharDonacion({
      tipo: "planificar", previo: leerDonacion(localStorage), firma, n, hoy: diaDeBuenosAires(new Date()), azar: Math.random(),
    });
  }, [firma, n]);
  useEffect(() => {
    if (donacion) guardarDonacion(localStorage, donacion);
  }, [donacion]);

  const posicionDonacion = posicionPendiente(donacion);
  // La tarjeta de donación va antes de la noticia `posicionDonacion` y no cuenta: el contador sigue en la anterior.
  const donacionArriba = posicionDonacion !== null && indice === posicionDonacion;
  const contextoDonacion = useCallback(
    () => ({ recorrido_id: obtenerMedicion().recorrido_id, posicion: posicionDonacion ?? 0, cantidad_tarjetas: n }),
    [n, posicionDonacion],
  );

  useEffect(() => {
    obtenerMedicion();
    return () => {
      liberacion = setTimeout(() => {
        if (window.location.pathname !== "/") medicionActual = undefined;
      }, 0);
    };
  }, []);

  const registrarInicio = useCallback(() => {
    const medicion = obtenerMedicion();
    if (medicion.iniciar()) registrarEvento("mazo_iniciado", { recorrido_id: medicion.recorrido_id, cantidad_tarjetas: n });
    return medicion;
  }, [n]);

  const registrarVista = useCallback((posicion: number) => {
    const tarjeta = tarjetas[posicion];
    if (!tarjeta) return;
    const medicion = registrarInicio();
    if (medicion.ver(tarjeta.identificador)) registrarEvento("tarjeta_vista", contextoMazo(tarjeta, medicion.recorrido_id, posicion, n));
  }, [n, registrarInicio, tarjetas]);

  useEffect(() => {
    if (!visible || !documentoVisible() || capa?.tipo === "guia") return;
    const medicion = registrarInicio();
    if (capa?.tipo === "detalle") {
      if (aperturaRegistrada.current !== capa) {
        const tarjeta = tarjetas[capa.indice];
        if (!tarjeta) return;
        registrarVista(capa.indice);
        registrarEvento("noticia_abierta", { ...contextoMazo(tarjeta, medicion.recorrido_id, capa.indice, n), superficie: "capa" });
        aperturaRegistrada.current = capa;
      }
    } else if (!capa && !enTransicion && donacionArriba) {
      // Una vez por día: al quedar marcada como vista, el efecto no vuelve a entrar.
      const hoy = diaDeBuenosAires(new Date());
      if (donacion?.ultimaVista !== hoy) {
        registrarEvento("donacion_vista", contextoDonacion());
        despacharDonacion({ tipo: "vista", hoy });
      }
    } else if (!capa && !enTransicion && indice < n) {
      registrarVista(indice);
    }
    if (!capa && !enTransicion && indice >= n && medicion.completar(n)) {
      registrarEvento("mazo_completado", { recorrido_id: medicion.recorrido_id, cantidad_tarjetas: n, ...conteosFinales(estado) });
    }
  }, [capa, contextoDonacion, donacion?.ultimaVista, donacionArriba, enTransicion, estado, indice, n, registrarInicio, registrarVista, tarjetas, visible]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Sin https no hay service worker; la app funciona igual.
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  // Cada capa ocupa una entrada del historial: el botón atrás del celular la cierra.
  const abrirCapa = useCallback((nueva: NonNullable<Capa>) => {
    window.history.pushState({ capa: nueva.tipo }, "");
    setCapa(nueva);
  }, []);
  const cerrarCapa = useCallback(() => window.history.back(), []);

  useEffect(() => {
    if (!capa) return;
    const alVolver = () => {
      setCapa(null);
      if (capa.tipo === "detalle") despachar({ tipo: "avanzar", hasta: capa.indice + 1 });
      else botonDescargar.current?.focus();
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [capa]);

  // appinstalled llega con la guía abierta.
  useEffect(() => {
    if (instalada && capa?.tipo === "guia") window.history.back();
  }, [instalada, capa]);

  const terminado = indice >= n;
  const pila = pilaVisible(indice, n, posicionDonacion, PROFUNDIDAD);

  const tarjetaAbierta = capa?.tipo === "detalle" ? tarjetas[capa.indice] : null;

  return (
    <div className={estilos.mazo}>
      <header className={estilos.cabecera}>
        <span>INFOMATE</span>
        <button
          className={estilos.anterior}
          type="button"
          aria-label="Volver a la noticia anterior"
          disabled={indice === 0 || enTransicion || capa !== null}
          onClick={() => despachar({ tipo: "anterior" })}
        >
          ←<b className={estilos.anteriorTexto}> Anterior</b>
        </button>
        <a
          className={estilos.apoyar}
          href={URL_MATECITO}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apoyar a Infomate con un matecito"
          onClick={() => {
            registrarEvento("donacion_abierta", { superficie: "cabecera" });
            despacharDonacion({ tipo: "resolver", apoyo: true, hoy: diaDeBuenosAires(new Date()) });
          }}
        >
          🧉<b className={estilos.apoyarTexto}>Apoyar</b>
        </a>
        {!instalada && (
          <button ref={botonDescargar} className={estilos.descargar} type="button" onClick={() => abrirCapa({ tipo: "guia" })}>
            Descargar
          </button>
        )}
        <span className={estilos.cuenta} data-prueba="cuenta">
          {Math.min(indice + (donacionArriba ? 0 : 1), n)}/{n}
        </span>
      </header>

      <div className={estilos.mesa}>
        {terminado ? (
          <div className={estilos.fin} data-prueba="fin">
            <h2>Terminaste.</h2>
            <p>{textoFin(estado)}</p>
            <button type="button" onClick={() => {
              medicionActual = crearMedicionMazo(crearId());
              aperturaRegistrada.current = null;
              despachar({ tipo: "reiniciar" });
            }}>
              Empezar de nuevo
            </button>
          </div>
        ) : (
          pila
            .map((lugar, k) => {
              if (lugar.tipo === "donacion") {
                return (
                  <TarjetaDonacion
                    key="donacion"
                    profundidad={k}
                    alApoyar={(origen) => {
                      // En el mismo evento del gesto, si no el navegador bloquea la pestaña. El botón ya es un link.
                      if (origen === "gesto") window.open(URL_MATECITO, "_blank", "noopener,noreferrer");
                      registrarEvento("donacion_abierta", { ...contextoDonacion(), superficie: "tarjeta" });
                      setEnTransicion(true);
                    }}
                    alDescartar={() => {
                      registrarEvento("donacion_descartada", contextoDonacion());
                      setEnTransicion(true);
                    }}
                    alTerminar={(apoyo) => {
                      setEnTransicion(false);
                      despacharDonacion({ tipo: "resolver", apoyo, hoy: diaDeBuenosAires(new Date()) });
                    }}
                  />
                );
              }
              const tarjeta = tarjetas[lugar.indice];
              return (
              <Tarjeta
                key={tarjeta.identificador}
                tarjeta={tarjeta}
                profundidad={k}
                contextoCompartir={() => ({ ...contextoMazo(tarjeta, obtenerMedicion().recorrido_id, lugar.indice, n), superficie: "tarjeta" })}
                alMarcar={(direccion) => {
                  if (documentoVisible()) registrarVista(indice);
                  if (direccion < 0) {
                    const medicion = registrarInicio();
                    registrarEvento("noticia_descartada", { ...contextoMazo(tarjeta, medicion.recorrido_id, indice, n), superficie: "tarjeta" });
                  }
                  setEnTransicion(true);
                  despachar({ tipo: "resolver", indice, resolucion: direccion > 0 ? "abierta" : "descartada" });
                }}
                alTerminar={(direccion) => {
                  setEnTransicion(false);
                  if (direccion > 0) abrirCapa({ tipo: "detalle", indice });
                  else despachar({ tipo: "avanzar", hasta: indice + 1 });
                }}
              />
              );
            })
            .reverse()
        )}
      </div>

      <footer className={estilos.pista} style={terminado ? { visibility: "hidden" } : undefined}>
        <span>{donacionArriba ? "← AHORA NO" : "← DESCARTAR"}</span>
        <span>{donacionArriba ? "APOYAR →" : "ABRIR →"}</span>
      </footer>

      {tarjetaAbierta && (
        <Detalle
          tarjeta={tarjetaAbierta}
          variante="capa"
          contextoMazo={() => ({ recorrido_id: obtenerMedicion().recorrido_id, posicion: indice + 1, cantidad_tarjetas: n })}
          compartir={<BotonCompartir identificador={tarjetaAbierta.identificador} titulo={tarjetaAbierta.titulo} contexto={() => ({ ...contextoMazo(tarjetaAbierta, obtenerMedicion().recorrido_id, indice, n), superficie: "capa" })} />}
          cierre={
            <button className={estilosDetalle.boton} type="button" onClick={cerrarCapa}>
              Volver y seguir
            </button>
          }
        />
      )}
      {capa?.tipo === "guia" && <Guia alCerrar={cerrarCapa} />}
    </div>
  );
}
