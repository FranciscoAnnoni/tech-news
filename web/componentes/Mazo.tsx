"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { crearId, registrarEvento } from "@/lib/analitica";
import { conteosFinales, contextoMazo, crearMedicionMazo } from "@/lib/medicionMazo";
import { estaInstalada, suscribirInstalacion } from "@/lib/instalacion";
import { ESTADO_INICIAL, reducirMazo, textoFin } from "@/lib/mazo";
import { buscaNoticias, direccionDelGesto, tironDeRecarga, type Direccion } from "@/lib/gestos";
import { CONSULTA_DIARIO } from "@/lib/portada";
import { firmaDelMazo, guardarProgreso, leerProgreso } from "@/lib/progreso";
import type { TarjetaNoticia } from "@/lib/tipos";
import { BotonCompartir } from "./BotonCompartir";
import { Cargando } from "./Cargando";
import { DeslizarParaVolver } from "./DeslizarParaVolver";
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

// Fuera de los teléfonos la portada muestra el Diario y el Mazo queda oculto por CSS: no debe medir
// tarjetas que nadie ve. Misma consulta que globals.css.
function suscribirDiario(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DIARIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
const seVeElDiario = () => window.matchMedia(CONSULTA_DIARIO).matches;

/** Algún contenedor con scroll entre el dedo y el Mazo ya bajó: el tirón es para volver arriba, no para recargar. */
function hayScrollArriba(objetivo: EventTarget | null, mazo: HTMLElement): boolean {
  for (let nodo = objetivo instanceof Element ? objetivo : null; nodo && nodo !== mazo; nodo = nodo.parentElement) {
    if (nodo.scrollTop > 0) return true;
  }
  return false;
}

type Recarga = "inactiva" | "tirando" | "lista" | "buscando";


export function Mazo({ tarjetas, numeroEdicion }: { tarjetas: TarjetaNoticia[]; numeroEdicion: number | null }) {
  const [estado, despachar] = useReducer(reducirMazo, ESTADO_INICIAL);
  const [capa, setCapa] = useState<Capa>(null);
  const [enTransicion, setEnTransicion] = useState(false);
  const botonDescargar = useRef<HTMLButtonElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const [recarga, setRecarga] = useState<Recarga>("inactiva");
  const aperturaRegistrada = useRef<Capa>(null);
  const documentoALaVista = useSyncExternalStore(suscribirVisibilidad, documentoVisible, () => false);
  const oculto = useSyncExternalStore(suscribirDiario, seVeElDiario, () => true);
  const visible = documentoALaVista && !oculto;
  // Oculto hasta hidratar: una app ya instalada nunca muestra el botón.
  const instalada = useSyncExternalStore(suscribirInstalacion, estaInstalada, () => true);

  const n = tarjetas.length;
  const { indice } = estado;
  const firma = firmaDelMazo(tarjetas.map((t) => t.id));

  // El servidor no conoce el progreso (vive en localStorage) y pintaría siempre la primera tarjeta: hasta leerlo se
  // muestra el loading. Restaurar y destapar van en el mismo layout effect, antes de pintar, así nunca se ven las
  // tarjetas de alguien que ya terminó para después saltar a "Terminaste".
  const [listo, marcarListo] = useReducer(() => true, false);
  useLayoutEffect(() => {
    const guardado = leerProgreso(localStorage, firma, n);
    if (guardado) despachar({ tipo: "restaurar", estado: guardado });
    marcarListo();
  }, [firma, n]);

  // Si llegó otra edición, la primera escritura pisa el progreso viejo. Antes de leerlo no se escribe nada.
  useEffect(() => {
    if (listo) guardarProgreso(localStorage, firma, estado);
  }, [firma, estado, listo]);

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
    // Sin el progreso restaurado, la tarjeta de arriba todavía no es la que se ve.
    if (!listo || !visible || !documentoVisible() || capa?.tipo === "guia") return;
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
  }, [capa, enTransicion, estado, indice, listo, n, registrarInicio, registrarVista, tarjetas, visible]);

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

  // Tirar hacia abajo en el Mazo (sin capa abierta) recarga la página para buscar noticias nuevas. Eventos touch y no
  // pointer: el texto de la tarjeta tiene scroll propio y el navegador cancela los pointer events al scrollear.
  const sinCapa = !capa && !enTransicion;
  useEffect(() => {
    const mazo = raiz.current;
    if (!mazo || !sinCapa) return;
    let inicio: { x: number; y: number; direccion: Direccion } | null = null;
    let mostrado: Recarga = "inactiva";
    const mostrar = (dy: number) => {
      if (aviso.current) aviso.current.style.transform = `translate(-50%, ${tironDeRecarga(dy)}px)`;
    };
    const alTocar = (e: TouchEvent) => {
      const dedo = e.touches[0];
      inicio = e.touches.length === 1 && dedo && !hayScrollArriba(e.target, mazo) ? { x: dedo.clientX, y: dedo.clientY, direccion: null } : null;
    };
    const alMover = (e: TouchEvent) => {
      const dedo = e.touches[0];
      if (!inicio || !dedo) return;
      const dx = dedo.clientX - inicio.x;
      const dy = dedo.clientY - inicio.y;
      inicio.direccion ??= direccionDelGesto(dx, dy);
      if (inicio.direccion !== "vertical" || dy <= 0) return;
      mostrar(dy);
      const ahora = buscaNoticias(dx, dy) ? "lista" : "tirando";
      if (ahora !== mostrado) setRecarga(ahora);
      mostrado = ahora;
    };
    const alSoltar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      if (!inicio || !dedo) return;
      const { x, y, direccion } = inicio;
      inicio = null;
      mostrado = "inactiva";
      if (direccion !== "vertical") return;
      if (buscaNoticias(dedo.clientX - x, dedo.clientY - y)) {
        setRecarga("buscando");
        window.location.reload();
      } else {
        mostrar(0);
        setRecarga("inactiva");
      }
    };
    mazo.addEventListener("touchstart", alTocar, { passive: true });
    mazo.addEventListener("touchmove", alMover, { passive: true });
    mazo.addEventListener("touchend", alSoltar, { passive: true });
    mazo.addEventListener("touchcancel", alSoltar, { passive: true });
    return () => {
      mazo.removeEventListener("touchstart", alTocar);
      mazo.removeEventListener("touchmove", alMover);
      mazo.removeEventListener("touchend", alSoltar);
      mazo.removeEventListener("touchcancel", alSoltar);
    };
  }, [sinCapa, listo]);

  // appinstalled llega con la guía abierta.
  useEffect(() => {
    if (instalada && capa?.tipo === "guia") window.history.back();
  }, [instalada, capa]);

  const terminado = indice >= n;
  const visibles = tarjetas.slice(indice, indice + PROFUNDIDAD);

  const tarjetaAbierta = capa?.tipo === "detalle" ? tarjetas[capa.indice] : null;

  if (!listo) return <Cargando numero={numeroEdicion} />;

  return (
    <div ref={raiz} className={estilos.mazo}>
      <div
        ref={aviso}
        className={estilos.recarga}
        data-estado={recarga}
        data-prueba="recarga"
        role="status"
        aria-hidden={recarga === "inactiva"}
      >
        {recarga === "buscando" ? "Buscando noticias…" : recarga === "lista" ? "Soltá para buscar noticias" : "↓ Tirá para buscar noticias"}
      </div>
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
            <p>No hay más noticias por ahora. Tirá hacia abajo para buscar nuevas.</p>
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
        <DeslizarParaVolver alVolver={cerrarCapa}>
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
        </DeslizarParaVolver>
      )}
      {capa?.tipo === "guia" && <Guia alCerrar={cerrarCapa} />}
    </div>
  );
}
