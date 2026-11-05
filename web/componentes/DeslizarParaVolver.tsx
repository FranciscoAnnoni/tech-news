"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { direccionDelGesto, vuelveALasTarjetas, type Direccion } from "@/lib/gestos";
import estilos from "./DeslizarParaVolver.module.css";

const SALIDA_MS = 200;

interface Gesto {
  id: number;
  x: number;
  y: number;
  ultimoX: number;
  ultimoT: number;
  velocidad: number;
  direccion: Direccion;
}

/**
 * Envuelve el Detalle del Mazo: deslizar hacia la izquierda lo cierra y vuelve a las tarjetas, igual que
 * "Volver y seguir". El scroll vertical del Detalle sigue siendo del navegador (touch-action: pan-y).
 */
export function DeslizarParaVolver({ alVolver, children }: { alVolver: () => void; children: ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const saliendo = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function mover(dx: number, transicion: string) {
    if (!nodo.current) return;
    nodo.current.style.transition = transicion;
    nodo.current.style.transform = dx ? `translateX(${dx}px)` : "";
  }

  function alBajar(e: PointerEvent<HTMLDivElement>) {
    if (saliendo.current || gesto.current || e.pointerType === "mouse") return;
    gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ultimoX: e.clientX, ultimoT: e.timeStamp, velocidad: 0, direccion: null };
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    if (!g.direccion) {
      g.direccion = direccionDelGesto(dx, e.clientY - g.y);
      if (g.direccion === "horizontal") e.currentTarget.setPointerCapture(g.id);
    }
    if (g.direccion !== "horizontal") return;
    const dt = e.timeStamp - g.ultimoT;
    if (dt > 0) g.velocidad = (e.clientX - g.ultimoX) / dt;
    g.ultimoX = e.clientX;
    g.ultimoT = e.timeStamp;
    // Solo acompaña hacia la izquierda: a la derecha no hay nada.
    mover(Math.min(dx, 0), "none");
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>, cancelado: boolean) {
    const g = gesto.current;
    if (!g || e.pointerId !== g.id) return;
    gesto.current = null;
    if (g.direccion !== "horizontal") return;
    if (!cancelado && vuelveALasTarjetas(e.clientX - g.x, g.velocidad)) {
      saliendo.current = true;
      if (nodo.current) mover(-nodo.current.offsetWidth, `transform ${SALIDA_MS}ms ease-in`);
      temporizador.current = setTimeout(alVolver, SALIDA_MS);
    } else {
      mover(0, "transform .2s ease-out");
    }
  }

  return (
    <div
      ref={nodo}
      className={estilos.capa}
      data-prueba="deslizar-para-volver"
      onPointerDown={alBajar}
      onPointerMove={alMover}
      onPointerUp={(e) => alSoltar(e, false)}
      onPointerCancel={(e) => alSoltar(e, true)}
    >
      {children}
    </div>
  );
}
