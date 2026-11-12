"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { alternarEquipo, sumarToque } from "@/lib/equipo";
import estilos from "./LogoInfomate.module.css";

type Mate = { id: number; dx: number; giro: number };

/**
 * El logo de Infomate. Cada toque saca un matecito (easter egg). Escondido a propósito: TOQUES toques seguidos alternan
 * el modo equipo, que oculta el pedido de aporte (ver lib/equipo.ts). La racha vive en memoria: recargar la reinicia.
 */
export function LogoInfomate({ children, className }: { children: ReactNode; className?: string }) {
  const toques = useRef({ cantidad: 0, ultimo: 0 });
  const proximo = useRef(0);
  const [mates, setMates] = useState<Mate[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const tocar = (e: MouseEvent<HTMLSpanElement>) => {
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sinMovimiento) {
      e.currentTarget.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.9) rotate(-4deg)" }, { transform: "scale(1.06) rotate(2deg)" }, { transform: "scale(1)" }],
        { duration: 320, easing: "cubic-bezier(.3,1.4,.5,1)" },
      );
      const mate = { id: proximo.current++, dx: Math.round(Math.random() * 60 - 30), giro: Math.round(Math.random() * 50 - 25) };
      setMates((actuales) => [...actuales.slice(-6), mate]);
    }
    const { completa, ...racha } = sumarToque(toques.current, e.timeStamp);
    toques.current = racha;
    if (!completa) return;
    setAviso(alternarEquipo(localStorage) ? "🧉 Modo equipo activado: sin pedidos de aporte" : "Modo equipo desactivado");
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), 2500);
  };

  return (
    <>
      <span className={`${estilos.logo} ${className ?? ""}`} onClick={tocar}>
        {children}
        {mates.map((m) => (
          <i
            key={m.id}
            className={estilos.mate}
            style={{ "--dx": `${m.dx}px`, "--giro": `${m.giro}deg` } as CSSProperties}
            aria-hidden="true"
            onAnimationEnd={() => setMates((actuales) => actuales.filter((x) => x.id !== m.id))}
          >
            🧉
          </i>
        ))}
      </span>
      {aviso && (
        <div className={estilos.aviso} role="status">
          {aviso}
        </div>
      )}
    </>
  );
}
