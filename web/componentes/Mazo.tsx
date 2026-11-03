"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { crearId, registrarEvento } from "@/lib/analitica";
import { conteosFinales, contextoMazo, crearMedicionMazo } from "@/lib/medicionMazo";
import { estaInstalada, suscribirInstalacion } from "@/lib/instalacion";
import { ESTADO_INICIAL, reducirMazo, textoFin } from "@/lib/mazo";
import { firmaDelMazo, guardarProgreso, leerProgreso } from "@/lib/progreso";
import type { TarjetaNoticia } from "@/lib/tipos";
import { BotonCompartir } from "./BotonCompartir";
import { Detalle } from "./Detalle";
import { Guia } from "./Guia";
import { Tarjeta } from "./Tarjeta";
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


export function Mazo({ tarjetas }: { tarjetas: TarjetaNoticia[] }) {
  const [estado, despachar] = useReducer(reducirMazo, ESTADO_INICIAL);
  const [capa, setCapa] = useState<Capa>(null);
  const [enTransicion, setEnTransicion] = useState(false);
  const botonDescargar = useRef<HTMLButtonElement>(null);
  const aperturaRegistrada = useRef<Capa>(null);
  const visible = useSyncExternalStore(suscribirVisibilidad, documentoVisible, () => false);
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
    } else if (!capa && !enTransicion && indice < n) {
      registrarVista(indice);
    }
    if (!capa && !enTransicion && indice >= n && medicion.completar(n)) {
      registrarEvento("mazo_completado", { recorrido_id: medicion.recorrido_id, cantidad_tarjetas: n, ...conteosFinales(estado) });
    }
  }, [capa, enTransicion, estado, indice, n, registrarInicio, registrarVista, tarjetas, visible]);

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
  const visibles = tarjetas.slice(indice, indice + PROFUNDIDAD);

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
          ← Anterior
        </button>
        {!instalada && (
          <button ref={botonDescargar} className={estilos.descargar} type="button" onClick={() => abrirCapa({ tipo: "guia" })}>
            Descargar
          </button>
        )}
        <span className={estilos.cuenta} data-prueba="cuenta">
          {Math.min(indice + 1, n)}/{n}
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
          visibles
            .map((tarjeta, k) => (
              <Tarjeta
                key={tarjeta.identificador}
                tarjeta={tarjeta}
                profundidad={k}
                contextoCompartir={() => ({ ...contextoMazo(tarjeta, obtenerMedicion().recorrido_id, indice + k, n), superficie: "tarjeta" })}
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
            ))
            .reverse()
        )}
      </div>

      <footer className={estilos.pista} style={terminado ? { visibility: "hidden" } : undefined}>
        <span>← DESCARTAR</span>
        <span>ABRIR →</span>
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
