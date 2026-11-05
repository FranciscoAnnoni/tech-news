"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { empiezaEnElBorde, esTironDesdeElBorde, vuelveALasTarjetas } from "@/lib/gestos";
import estilos from "./DeslizarParaVolver.module.css";

const SALIDA_MS = 200;
/** Antes de esta distancia todavía no se sabe si es un tirón desde el borde o un scroll. */
const ZONA_MUERTA = 8;

interface Gesto {
  x: number;
  y: number;
  ultimoX: number;
  ultimoT: number;
  velocidad: number;
  estado: "pendiente" | "tirando" | "descartado";
}

/**
 * Envuelve el Detalle del Mazo con el gesto de volver de iOS: apoyar el dedo en el borde izquierdo y arrastrar hacia
 * la derecha, aunque sea en diagonal. Vuelve a las tarjetas igual que "Volver y seguir".
 * Eventos touch y no pointer: con touch-action: pan-y el navegador cancela los pointer events si el dedo baja un poco.
 * Mientras se tira desde el borde se frena el scroll (touchmove no pasivo); el resto del Detalle scrollea como siempre.
 */
export function DeslizarParaVolver({ alVolver, children }: { alVolver: () => void; children: ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null);
  const volver = useRef(alVolver);

  useEffect(() => {
    volver.current = alVolver;
  }, [alVolver]);

  useEffect(() => {
    const capa = nodo.current;
    if (!capa) return;
    let gesto: Gesto | null = null;
    let saliendo = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const mover = (dx: number, transicion: string) => {
      capa.style.transition = transicion;
      capa.style.transform = dx ? `translateX(${dx}px)` : "";
    };
    const alTocar = (e: TouchEvent) => {
      const dedo = e.touches[0];
      gesto = null;
      if (saliendo || e.touches.length !== 1 || !dedo) return;
      if (!empiezaEnElBorde(dedo.clientX, capa.getBoundingClientRect().left)) return;
      gesto = { x: dedo.clientX, y: dedo.clientY, ultimoX: dedo.clientX, ultimoT: e.timeStamp, velocidad: 0, estado: "pendiente" };
    };
    const alMover = (e: TouchEvent) => {
      const dedo = e.touches[0];
      if (!gesto || !dedo || gesto.estado === "descartado") return;
      const dx = dedo.clientX - gesto.x;
      const dy = dedo.clientY - gesto.y;
      if (gesto.estado === "pendiente") {
        if (Math.hypot(dx, dy) < ZONA_MUERTA) return;
        gesto.estado = esTironDesdeElBorde(dx, dy) ? "tirando" : "descartado";
        if (gesto.estado === "descartado") return;
      }
      if (e.cancelable) e.preventDefault();
      const dt = e.timeStamp - gesto.ultimoT;
      if (dt > 0) gesto.velocidad = (dedo.clientX - gesto.ultimoX) / dt;
      gesto.ultimoX = dedo.clientX;
      gesto.ultimoT = e.timeStamp;
      mover(Math.max(dx, 0), "none");
    };
    const alSoltar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      const g = gesto;
      gesto = null;
      if (!g || !dedo || g.estado !== "tirando") return;
      if (e.type === "touchend" && vuelveALasTarjetas(dedo.clientX - g.x, g.velocidad)) {
        saliendo = true;
        mover(capa.offsetWidth, `transform ${SALIDA_MS}ms ease-in`);
        temporizador = setTimeout(() => volver.current(), SALIDA_MS);
      } else {
        mover(0, "transform .2s ease-out");
      }
    };

    capa.addEventListener("touchstart", alTocar, { passive: true });
    capa.addEventListener("touchmove", alMover, { passive: false });
    capa.addEventListener("touchend", alSoltar, { passive: true });
    capa.addEventListener("touchcancel", alSoltar, { passive: true });
    return () => {
      clearTimeout(temporizador);
      capa.removeEventListener("touchstart", alTocar);
      capa.removeEventListener("touchmove", alMover);
      capa.removeEventListener("touchend", alSoltar);
      capa.removeEventListener("touchcancel", alSoltar);
    };
  }, []);

  return (
    <div ref={nodo} className={estilos.capa} data-prueba="deslizar-para-volver">
      {children}
    </div>
  );
}
