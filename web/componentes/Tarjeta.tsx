"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import estilos from "./Tarjeta.module.css";

const UMBRAL = 100;
const SALIDA_MS = 240;

interface Gesto {
  id: number;
  x: number;
  y: number;
  ultimoX: number;
  ultimoT: number;
  velocidad: number;
  modo: "horizontal" | "vertical" | null;
}

export function Tarjeta({
  tarjeta,
  profundidad,
  alMarcar,
  alTerminar,
}: {
  tarjeta: TarjetaNoticia;
  profundidad: number;
  alMarcar: (direccion: number) => void;
  alTerminar: (direccion: number) => void;
}) {
  const nodo = useRef<HTMLElement>(null);
  const selloAbrir = useRef<HTMLDivElement>(null);
  const selloDescartar = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const saliendo = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const arriba = profundidad === 0;

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function resolver(direccion: number) {
    if (saliendo.current || !nodo.current) return;
    saliendo.current = true;
    alMarcar(direccion);
    nodo.current.style.transition = `transform ${SALIDA_MS}ms ease-in`;
    nodo.current.style.transform = `translateX(${direccion * 135}%) rotate(${direccion * 20}deg)`;
    temporizador.current = setTimeout(() => alTerminar(direccion), SALIDA_MS);
  }

  function reponer() {
    if (!nodo.current || !selloAbrir.current || !selloDescartar.current) return;
    nodo.current.style.transition = "transform .2s ease-out";
    nodo.current.style.transform = "";
    nodo.current.style.cursor = "";
    selloAbrir.current.style.opacity = "0";
    selloDescartar.current.style.opacity = "0";
  }

  function alBajar(e: PointerEvent<HTMLElement>) {
    if (gesto.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    gesto.current = {
      id: e.pointerId, x: e.clientX, y: e.clientY,
      ultimoX: e.clientX, ultimoT: e.timeStamp, velocidad: 0, modo: null,
    };
  }

  function alMover(e: PointerEvent<HTMLElement>) {
    const g = gesto.current;
    if (!g || e.pointerId !== g.id || !nodo.current) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.modo) {
      if (Math.hypot(dx, dy) < 8) return;
      g.modo = Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
      if (g.modo === "horizontal") {
        e.currentTarget.setPointerCapture(g.id);
        nodo.current.style.transition = "none";
        nodo.current.style.cursor = "grabbing";
      }
    }
    if (g.modo !== "horizontal") return;
    const dt = e.timeStamp - g.ultimoT;
    if (dt > 0) g.velocidad = (e.clientX - g.ultimoX) / dt;
    g.ultimoX = e.clientX;
    g.ultimoT = e.timeStamp;
    const progreso = String(Math.min(Math.abs(dx) / UMBRAL, 1));
    nodo.current.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
    if (selloAbrir.current) selloAbrir.current.style.opacity = dx > 0 ? progreso : "0";
    if (selloDescartar.current) selloDescartar.current.style.opacity = dx < 0 ? progreso : "0";
  }

  function alSoltar(e: PointerEvent<HTMLElement>, cancelado: boolean) {
    const g = gesto.current;
    if (!g || e.pointerId !== g.id) return;
    gesto.current = null;
    const dx = e.clientX - g.x;
    if (g.modo === "vertical") return;
    if (!g.modo) {
      if (!cancelado) resolver(1); // un toque abre
      return;
    }
    const confirmado = !cancelado && (Math.abs(dx) >= UMBRAL || (Math.abs(g.velocidad) > 0.6 && Math.abs(dx) > 40));
    if (confirmado) resolver(Math.sign(dx));
    else reponer();
  }

  return (
    <article
      ref={nodo}
      className={estilos.tarjeta}
      data-k={profundidad}
      data-talla={tarjeta.talla}
      data-prueba={arriba ? "tarjeta-arriba" : undefined}
      style={{ "--k": profundidad, "--tono": tarjeta.tono } as CSSProperties}
      {...(arriba
        ? {
            onPointerDown: alBajar,
            onPointerMove: alMover,
            onPointerUp: (e: PointerEvent<HTMLElement>) => alSoltar(e, false),
            onPointerCancel: (e: PointerEvent<HTMLElement>) => alSoltar(e, true),
          }
        : {})}
    >
      <div className={estilos.origen}>
        <span className={estilos.monograma}>{tarjeta.letras}</span>
        <span className={estilos.fuente}>{tarjeta.fuente}</span>
        <span className={estilos.categoria}>{tarjeta.categoria}</span>
      </div>
      <h2 className={estilos.titulo}>{tarjeta.titulo}</h2>
      {tarjeta.descripcion && <p className={estilos.descripcion}>{tarjeta.descripcion}</p>}
      <div className={estilos.fecha}>{tarjeta.fecha}</div>
      <div ref={selloAbrir} className={`${estilos.sello} ${estilos.selloAbrir}`}>ABRIR</div>
      <div ref={selloDescartar} className={`${estilos.sello} ${estilos.selloDescartar}`}>DESCARTAR</div>
    </article>
  );
}
